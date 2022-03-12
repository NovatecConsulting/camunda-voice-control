import i18next from "i18next";

function getAttributesString(userTask) {
    let attributesString = "attributes.vars = {\n";
    userTask.variables.forEach(it => {
        attributesString = attributesString + `                "${it.varName}": "", // vars need to be initialized\n` 
    });
    attributesString = attributesString + "            }";
    return attributesString;
}

async function createLambdaNodeJS(camundaRestEndpoint, userTasks) {
    let completeTaskWithVars = "";
    let variableCount = 0;
    let first = true;
    for (let i = 0; i < userTasks.length; i++) {
        if (userTasks[i].variables.length > 0 && first) {
            completeTaskWithVars = completeTaskWithVars + `if (assignedTask.name === '${userTasks[i].taskName}') {\n            ${getAttributesString(userTasks[i])};\n            attributes.lastAskedVar = "${userTasks[i].variables[0].varName}";\n            speakOutput = \`${userTasks[i].variables[0].varQuestion}\`;\n        }`;
            first = false;
            variableCount = variableCount + 1;
        } else if (userTasks[i].variables.length > 0 && i != 0) {
            completeTaskWithVars = completeTaskWithVars + ` else if (assignedTask.name === '${userTasks[i].taskName}') {\n            ${getAttributesString(userTasks[i])};\n            attributes.lastAskedVar = "${userTasks[i].variables[0].varName}";\n            speakOutput = \`${userTasks[i].variables[0].varQuestion}\`;\n        }`;
            variableCount = variableCount + 1;
        }
    }

    if(variableCount > 0) {
        completeTaskWithVars = completeTaskWithVars + " else "
    }

    let questions = "const questions = {\n"
    userTasks.forEach(task => {
        task.variables.forEach(variable => {
            questions = questions +`    "${variable.varName}": {\n        "question": "${variable.varQuestion}",\n        "type": "${variable.varType}"\n    },\n`
        })
    })
    questions = questions + "}"

    let nodeJsLogic = await fetch('ressources/templateLambdaLogic.js').then(data => data.text());
    nodeJsLogic = nodeJsLogic.replace('{{questions}}', questions);
    nodeJsLogic = nodeJsLogic.replace('{{camundaRestEndpoint}}', camundaRestEndpoint);
    nodeJsLogic = nodeJsLogic.replace('{{completeTaskWithVars}}', completeTaskWithVars);

    // e.g. {{launchRequestHandler.speakOutput}}
    const translatePlaceholders = nodeJsLogic.match(/{{\w+.\w+}}/g);
    translatePlaceholders.forEach(it => {
        let i18name = it.replace(/[{}]/g, "");
        nodeJsLogic = nodeJsLogic.replace(it, i18next.t(i18name))
    })

    return nodeJsLogic;

}

async function createPackageJson () {
    return await fetch('ressources/templatePackage.json').then(data => data.text());
}

export { createLambdaNodeJS, createPackageJson }