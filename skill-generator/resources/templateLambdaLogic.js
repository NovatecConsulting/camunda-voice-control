const Alexa = require('ask-sdk-core');
const axios = require('axios');
{{questions}}

const camundaRestEndpoint = `{{camundaRestEndpoint}}`;

function removeBracketsAndDollarsymbol(variable){
    // takes e.g. '${order}' and returns 'order'
    return variable.replace(/[${}]/g, "");
}

function parseTaskDescription(taskDescription) {
    // takes e.g. "Du musst ${order} und ${task} bearbeiten" and extracts ${order} and ${task}
    const camundaVariables = taskDescription.match(/\${\w+}/g);

    if (camundaVariables !== null) {
        camundaVariables.forEach(variable => {
            taskDescription = taskDescription.replace(variable, `\${taskDetails.${removeBracketsAndDollarsymbol(variable)}.value}`);
        })
    }
    
    return taskDescription;
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = `{{LaunchRequestHandler.speakOutput}}`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const NewTaskIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NewTaskIntent';
    },
    async handle(handlerInput){
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        let allTasks = [];
        
        try {
            const response = await axios.get(`${camundaRestEndpoint}/task?unassigned=true`);
            allTasks = response.data;
        } catch(error) {
            console.log('GET all unassigned tasks failed ', error);
        }
        
        let speakOutput = `{{NewTaskIntentHandler.noNewTaskSpeakOutput}}`;

        if (allTasks.length > 0) {
            const task = allTasks[0]
            const taskId = task.id;
            speakOutput = `{{NewTaskIntentHandler.task}} ${taskId}: ${task.name}`;
            if (task.description !== null){
                speakOutput = `{{NewTaskIntentHandler.task}} ${taskId}: ${task.name}. ${task.description}`;
            }
            try {
                const description = parseTaskDescription(task.description);
                speakOutput = `{{NewTaskIntentHandler.task}} ${taskId}: ${task.name}. ${description}`;
            } catch(error) {
                console.log(`parse task details for ${taskId} failed `, error);
            }
            try {
                const claimTask = await axios.post(`${camundaRestEndpoint}/task/${taskId}/claim`, {"userId": "ALEXA"});
            } catch(error){
                console.log(`POST claim task for task ${taskId} failed `, error);
            }
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
    }
}

const InProgressCompleteTaskIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CompleteTaskIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();   
    }
}

const IdNotGivenCompleteTaskIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CompleteTaskIntent'
            && !handlerInput.requestEnvelope.request.intent.slots.taskId.value;
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        let currentIntent = handlerInput.requestEnvelope.request.intent;
        const taskIdSlot = currentIntent.slots.taskId;
        
        let allAssignedTasks = [];
        
        let speakOutput = `{{IdNotGivenCompleteTaskIntentHandler.noAssignedTask}}`;

        try {
            const fetchAssignedTasks = await axios.get(`${camundaRestEndpoint}/task?assignee=ALEXA`);
            allAssignedTasks = fetchAssignedTasks.data;
        } catch(error) {
            console.log('GET all to ALEXA assigned tasks failed ', error);
        }
        
        if(!taskIdSlot.value && allAssignedTasks.length === 1) {
            
            // auto set value
            currentIntent.slots.taskId.value = allAssignedTasks[0].id;
            
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        if(allAssignedTasks.length > 1) {
            speakOutput = `{{IdNotGivenCompleteTaskIntentHandler.chooseTask}} ${allAssignedTasks[0].id}`;

            let i;
            for (i = 1; i < allAssignedTasks.length; i++) {
                if (i === allAssignedTasks.length - 1) {
                    speakOutput = speakOutput + ` {{IdNotGivenCompleteTaskIntentHandler.or}} ${allAssignedTasks[i].id}?`;
                } else {
                    speakOutput = speakOutput + `, ${allAssignedTasks[i].id}`;
                }
            }
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .addElicitSlotDirective('taskId')
                .getResponse();

        }
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
    
}

const CompletedCompleteTaskIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CompleteTaskIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        let currentIntent = handlerInput.requestEnvelope.request.intent;
        const taskId = currentIntent.slots.taskId.value;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        let assignedTask;

        let speakOutput = `{{CompletedCompleteTaskIntentHandler.unknownTask}}`

        try {
            const response = await axios.get(`${camundaRestEndpoint}/task/${taskId}`);
            assignedTask = response.data;
        } catch (error) {
            console.log(`GET task for taskId ${taskId} failed`, error)
        }
        attributes.taskId = taskId;
        {{completeTaskWithVars}}if (assignedTask.assignee === 'ALEXA') {
            try {
                const completeTask = await axios.post(`${camundaRestEndpoint}/task/${taskId}/complete`, {});
                speakOutput = `{{CompletedCompleteTaskIntentHandler.completedTask}}`
            } catch (error) {
                console.log(`Complete task for taskId ${taskId} failed`, error)
            }
            
        } else {
            speakOutput = "{{CompletedCompleteTaskIntentHandler.error}}"
        }
        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}

const YesAfterCompleteTaskIntentHandler = {
    canHandle(handlerInput) {
        const lastIntent = handlerInput.attributesManager.getSessionAttributes().lastIntent;
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
            && (lastIntent === 'CompleteTaskIntent' || lastIntent === 'AMAZON.YesIntent' || lastIntent === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const lastAskedVar = attributes.lastAskedVar;
        attributes.vars[lastAskedVar] = true;
        let speakOutput = "{{YesAfterCompleteTaskIntentHandler.unknownTask}}";
        let done = true;
        const keys = Object.keys(attributes.vars);
        for (let i = 0; i < keys.length; i++) {
            if (attributes.vars[keys[i]] === "") {
                attributes.lastAskedVar = keys[i];
                speakOutput = questions[keys[i]].question;
                done = false;
                break;
            }
        }
        if (done) {
            try {
                let postBody = {
                    "variables": {}
                }
                const keys = Object.keys(attributes.vars)
                keys.forEach( it => {
                    postBody.variables[it] = {} 
                    postBody.variables[it].value = attributes.vars[it]
                }) 
                const completeTask = await axios.post(`${camundaRestEndpoint}/task/${attributes.taskId}/complete`, postBody);
                speakOutput = `{{YesAfterCompleteTaskIntentHandler.completedTask}}`
            } catch (error) {
                console.log(`Complete task for taskId ${attributes.taskId} failed`, error)
            }
        }

        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}

const NoAfterCompleteTaskIntentHandler = {
    canHandle(handlerInput) {
        const lastIntent = handlerInput.attributesManager.getSessionAttributes().lastIntent;
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
            && (lastIntent === 'CompleteTaskIntent' || lastIntent === 'AMAZON.YesIntent' || lastIntent === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const lastAskedVar = attributes.lastAskedVar;
        attributes.vars[lastAskedVar] = false;
        let speakOutput = "{{NoAfterCompleteTaskIntentHandler.unknownTask}}"
        let done = true;
        const keys = Object.keys(attributes.vars);
        for (let i = 0; i < keys.length; i++) {
            if (attributes.vars[keys[i]] === "") {
                attributes.lastAskedVar = keys[i];
                speakOutput = questions[keys[i]].question;
                done = false;
                break;
            }
        }
        if (done) {
            try {
                let postBody = {
                    "variables": {}
                }
                const keys = Object.keys(attributes.vars)
                keys.forEach( it => {
                    postBody.variables[it] = {} 
                    postBody.variables[it].value = attributes.vars[it]
                }) 
                const completeTask = await axios.post(`${camundaRestEndpoint}/task/${attributes.taskId}/complete`, postBody);
                speakOutput = `{{NoAfterCompleteTaskIntentHandler.completedTask}}`
            } catch (error) {
                console.log(`Complete task for taskId ${attributes.taskId} failed`, error)
            }
        }

        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }    
}

const InProgressTaskDetailsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TaskDetailsIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();   
    }
}

const IdNotGivenTaskDetailsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TaskDetailsIntent'
            && !handlerInput.requestEnvelope.request.intent.slots.taskId.value;
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        let currentIntent = handlerInput.requestEnvelope.request.intent;
        const taskIdSlot = currentIntent.slots.taskId;
        
        let allAssignedTasks = [];
        
        let speakOutput = `{{IdNotGivenTaskDetailsIntentHandler.noAssignedTask}}`;

        try {
            const fetchAssignedTasks = await axios.get(`${camundaRestEndpoint}/task?assignee=ALEXA`);
            allAssignedTasks = fetchAssignedTasks.data;
        } catch(error) {
            console.log('GET all to ALEXA assigned tasks failed ', error);
        }
        
        if(!taskIdSlot.value && allAssignedTasks.length === 1) {
            
            // auto set value
            currentIntent.slots.taskId.value = allAssignedTasks[0].id;
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        if(allAssignedTasks.length > 1) {
            speakOutput = `{{IdNotGivenTaskDetailsIntentHandler.chooseTask}} ${allAssignedTasks[0].id}`;

            let i;
            for (i = 1; i < allAssignedTasks.length; i++) {
                if (i === allAssignedTasks.length - 1) {
                    speakOutput = speakOutput + ` {{IdNotGivenTaskDetailsIntentHandler.or}} ${allAssignedTasks[i].id}?`;
                } else {
                    speakOutput = speakOutput + `, ${allAssignedTasks[i].id}`;
                }
            }
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .addElicitSlotDirective('taskId')
                .getResponse();

        }
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
    
}

const CompletedTaskDetailsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TaskDetailsIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        let currentIntent = handlerInput.requestEnvelope.request.intent;
        const taskId = currentIntent.slots.taskId.value;
        let assignedTask;

        let speakOutput = `{{CompletedTaskDetailsIntentHandler.unknownTask}}`;

        try {
            const response = await axios.get(`${camundaRestEndpoint}/task/${taskId}`);
            assignedTask = response.data;
        } catch (error) {
            console.log(`GET task for taskId ${taskId} failed`, error)
        }
        
        if (assignedTask.assignee === 'ALEXA') {
            const taskId = assignedTask.id;
            speakOutput = `{{CompletedTaskDetailsIntentHandler.task}} ${taskId}: ${assignedTask.name}`;
            if (assignedTask.description !== null){
                speakOutput = `{{CompletedTaskDetailsIntentHandler.task}} ${taskId}: ${assignedTask.name}. ${assignedTask.description}`;
            }
            try {
                const description = parseTaskDescription(assignedTask.description);
                speakOutput = `{{CompletedTaskDetailsIntentHandler.fullTaskDetails}}`;
            } catch(error) {
                console.log(`parse task details for ${taskId} failed `, error);
            }
        }
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `{{HelpIntentHandler.speakOutput}}`;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `{{CancelAndStopIntentHandler.speakOutput}}`;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
    * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
    * It must also be defined in the language model (if the locale supports it)
    * This handler can be safely added but will be ignored in locales that do not support it yet
    * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `{{FallbackIntentHandler.speakOutput}}`;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
    * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
    * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
    * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
    * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `{{ErrorHandler.speakOutput}}`;
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NewTaskIntentHandler,
        IdNotGivenCompleteTaskIntentHandler,
        InProgressCompleteTaskIntentHandler,
        CompletedCompleteTaskIntentHandler,
        YesAfterCompleteTaskIntentHandler,
        NoAfterCompleteTaskIntentHandler,
        IdNotGivenTaskDetailsIntentHandler,
        InProgressTaskDetailsIntentHandler,
        CompletedTaskDetailsIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler)
    .addErrorHandlers(
        ErrorHandler)
    .lambda();