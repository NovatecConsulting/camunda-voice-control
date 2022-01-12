function getAttributesString(userTask) {
    let attributesString = "attributes.vars = {\n"
    userTask.variables.forEach(it => {
        attributesString = attributesString + `                "${it.varName}": "", // vars need to be initialized\n` 
    })
    attributesString = attributesString + "            }"
    return attributesString;
}

function createLambdaNodeJS(camundaRestEndpoint, userTasks) {
    let completeTaskWithVars = ""
    for (let i = 0; i < userTasks.length; i++) {
        let first = true;
        if (userTasks[i].variables.length > 0 && first) {
            completeTaskWithVars = completeTaskWithVars + `if (assignedTask.name === '${userTasks[i].taskName}') {\n            ${getAttributesString(userTasks[i])};\n            attributes.lastAskedVar = "${userTasks[i].variables[0].varName}";\n            speakOutput = \`${userTasks[i].variables[0].varQuestion}\`;\n        }`
            first = false;
        } else if (userTasks[i].variables.length > 0 && i != 0) {
            completeTaskWithVars = completeTaskWithVars + ` else if (assignedTask.name === '${userTasks[i].taskName}') {\n            ${getAttributesString(userTasks[i])};\n            attributes.lastAskedVar = "${userTasks[i].variables[0].varName}";\n            speakOutput = \`${userTasks[i].variables[0].varQuestion}\`;\n        }`
        }
    }

    let questions = "const questions = {\n"
    userTasks.forEach(task => {
        task.variables.forEach(variable => {
            questions = questions +`    "${variable.varName}": {\n        "question": "${variable.varQuestion}",\n        "type": "${variable.varType}"\n    },\n`
        })
    })
    questions = questions + "}"

    return `
const Alexa = require('ask-sdk-core');
const axios = require('axios');
${questions}

const camundaRestEndpoint = '${camundaRestEndpoint}';

function removeBracketsAndDollarsymbol(variable){
    // takes e.g. '\${order}' and returns 'order'
    return variable.replace(/[\$\{\}]/g, "");
}

function parseTaskDescription(taskDescription) {
    // takes e.g. "Du musst \${order} und \${task} bearbeiten" and extracts \${order} and \${task}
    const camundaVariables = taskDescription.match(/\\$\{\\w+\\}/g);

    if (camundaVariables !== null) {
        camundaVariables.forEach(variable => {
            taskDescription = taskDescription.replace(variable, \`\\\${taskDetails.\${removeBracketsAndDollarsymbol(variable)}.value}\`);
        })
    }
    
    return taskDescription;
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hallo, du kannst Aufgaben anfordern und abschlie\u00dfen. Was m\u00f6chtest du tun?'; 
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
            const response = await axios.get(\`\${camundaRestEndpoint}/task?unassigned=true\`);
            allTasks = response.data;
        } catch(error) {
            console.log('GET all unassigned tasks failed ', error);
        }
        
        let speakOutput = 'Es gibt gerade keine offenen Aufgaben.';

        if (allTasks.length > 0) {
            const task = allTasks[0]
            const taskId = task.id;
            speakOutput = \`Aufgabe \${taskId}: \${task.name}\`;
            if (task.description !== null){
                speakOutput = \`Aufgabe \${taskId}: \${task.name}. \${task.description}\`;
            }
            try {
                // WHY DO I DO THIS
                const taskDetailsRequest = await axios.get(\`\${camundaRestEndpoint}/task/\${taskId}/variables\`);
                const taskDetails = taskDetailsRequest.data;
                const description = parseTaskDescription(task.description);
                speakOutput = \`Aufgabe \${taskId}: \${task.name}. \${description}\`;
            } catch(error) {
                console.log(\`GET task details for \${taskId} failed \`, error);
            }
            try {
                const claimTask = await axios.post(\`\${camundaRestEndpoint}/task/\${taskId}/claim\`, {"userId": "ALEXA"});
            } catch(error){
                console.log(\`POST claim task for task \${taskId} failed \`, error);
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
        
        let speakOutput = 'Du musst gerade keine Aufgaben bearbeiten.';

        try {
            const fetchAssignedTasks = await axios.get(\`\${camundaRestEndpoint}/task?assignee=ALEXA\`);
            allAssignedTasks = fetchAssignedTasks.data;
        } catch(error) {
            console.log('GET all to ALEXA assigend tasks failed ', error);
        }
        
        if(!taskIdSlot.value && allAssignedTasks.length === 1) {
            
            // auto set value
            currentIntent.slots.taskId.value = allAssignedTasks[0].id;
            
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        if(allAssignedTasks.length > 1) {
            speakOutput = \`Meinst du Aufgabe \${allAssignedTasks[0].id}\`;

            let i;
            for (i = 1; i < allAssignedTasks.length; i++) {
                if (i === allAssignedTasks.length - 1) {
                    speakOutput = speakOutput + \` oder \${allAssignedTasks[i].id}?\`;
                } else {
                    speakOutput = speakOutput + \`, \${allAssignedTasks[i].id}\`;
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

        let speakOutput = 'Diese Aufgabe kenne ich nicht.'

        try {
            const response = await axios.get(\`\${camundaRestEndpoint}/task/\${taskId}\`);
            assignedTask = response.data;
        } catch (error) {
            console.log(\`GET task for taskId \${taskId} failed\`, error)
        }
        attributes.taskId = taskId;
        ${completeTaskWithVars} else if (assignedTask.assignee === 'ALEXA') {
            try {
                const completeTask = await axios.post(\`\${camundaRestEndpoint}/task/\${taskId}/complete\`, {});
                speakOutput = \`Aufgabe \${taskId} abgeschlossen. Was m\u00f6chtest du als n\u00e4chstes tun?\`
            } catch (error) {
                console.log(\`Complete task for taskId \${taskId} failed\`, error)
            }
            
        } else {
            speakOutput = "Da ist etwas schief gegangen."
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
        let speakOutput = "unbekannt"
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
                const completeTask = await axios.post(\`\${camundaRestEndpoint}/task/\${attributes.taskId}/complete\`, postBody);
                speakOutput = \`Aufgabe \${attributes.taskId} abgeschlossen. Was m\u00f6chtest du als n\u00e4chstes tun?\`
            } catch (error) {
                console.log(\`Complete task for taskId \${attributes.taskId} failed\`, error)
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
        let speakOutput = "unbekannt"
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
                const completeTask = await axios.post(\`\${camundaRestEndpoint}/task/\${attributes.taskId}/complete\`, postBody);
                speakOutput = \`Aufgabe \${attributes.taskId} abgeschlossen. Was m\u00f6chtest du als n\u00e4chstes tun?\`
            } catch (error) {
                console.log(\`Complete task for taskId \${attributes.taskId} failed\`, error)
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
        
        let speakOutput = 'Du musst gerade keine Aufgaben bearbeiten.';

        try {
            const fetchAssignedTasks = await axios.get(\`\${camundaRestEndpoint}/task?assignee=ALEXA\`);
            allAssignedTasks = fetchAssignedTasks.data;
        } catch(error) {
            console.log('GET all to ALEXA assigend tasks failed ', error);
        }
        
        if(!taskIdSlot.value && allAssignedTasks.length === 1) {
            
            // auto set value
            currentIntent.slots.taskId.value = allAssignedTasks[0].id;
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        if(allAssignedTasks.length > 1) {
            speakOutput = \`Meinst du Aufgabe \${allAssignedTasks[0].id}\`;

            let i;
            for (i = 1; i < allAssignedTasks.length; i++) {
                if (i === allAssignedTasks.length - 1) {
                    speakOutput = speakOutput + \` oder \${allAssignedTasks[i].id}?\`;
                } else {
                    speakOutput = speakOutput + \`, \${allAssignedTasks[i].id}\`;
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

        let speakOutput = 'Diese Aufgabe kenne ich nicht.'

        try {
            const response = await axios.get(\`\${camundaRestEndpoint}/task/\${taskId}\`);
            assignedTask = response.data;
        } catch (error) {
            console.log(\`GET task for taskId \${taskId} failed\`, error)
        }
        
        if (assignedTask.assignee === 'ALEXA') {
            const taskId = assignedTask.id;
            speakOutput = \`Aufgabe \${taskId}: \${assignedTask.name}\`;
            if (assignedTask.description !== null){
                speakOutput = \`Aufgabe \${taskId}: \${assignedTask.name}. \${assignedTask.description}\`;
            }
            try {
                const taskDetailsRequest = await axios.get(\`\${camundaRestEndpoint}/task/\${taskId}/variables\`);
                const taskDetails = taskDetailsRequest.data;
                const description = parseTaskDescription(assignedTask.description);
                speakOutput = \`Aufgabe \${taskId}: \${assignedTask.name}. \${description} Was kann ich sonst noch f\u00fcr dich tun?\`;
            } catch(error) {
                console.log(\`GET task details for \${taskId} failed \`, error);
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
        const speakOutput = 'Ich kann dir eine Aufgabe geben, Du kannst deine Aufgaben abschlie\u00dfen oder dir Details geben lassen. Was m\u00f6chtest du tun?';
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
        const speakOutput = 'Tsch\u00fcss!';
        handlerInput.attributesManager.setSessionAttributes(attributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
    * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
    * It must also be defined in the language model (if the locale supports it)
    * This handler can be safely added but will be ingnored in locales that do not support it yet 
    * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = 'Sorry, Da ist etwas schief gegangen. Probiere es bitte nochmal.';
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
        console.log(\`~~~~ Session ended: \${JSON.stringify(handlerInput.requestEnvelope)}\`);
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
        const speakOutput = 'Sorry, Ein Fehler ist aufgetreten. Bitte nochmal versuchen.';
        console.log(\`~~~~ Error handled: \${JSON.stringify(error)}\`);
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
`;
}

const lambdaNodeJSPackageJson = `{
"name": "camunda-skill-generator",
"version": "1.2.0",
"description": "alexa utility for quickly building skills",
"main": "index.js",
"scripts": {
    "test": "echo \\\"Error: no test specified\\\" && exit 1"
},
"author": "Amazon Alexa",
"license": "Apache License",
"dependencies": {
    "ask-sdk-core": "^2.7.0",
    "ask-sdk-model": "^1.19.0",
    "aws-sdk": "^2.326.0",
    "axios": "^0.24.0"
}
}`;

export { createLambdaNodeJS, lambdaNodeJSPackageJson }