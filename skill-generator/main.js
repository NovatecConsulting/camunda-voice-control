import lambdaNodeJSgitignore from './modules/gitignore.js'
import createInteractionModelDe from './modules/interactionModel.js'
import { createLambdaNodeJS, lambdaNodeJSPackageJson } from './modules/lambda.js'


let camundaRestEndpoint;
let invocationName;
// XML
const fileSelector = document.getElementById('file-selector');
let fileList = undefined
fileSelector.addEventListener('change', (event) => {
    fileList = event.target.files;
    readFile(fileList[0])
});
let userTasks = []

function parseXML(xmlAsString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlAsString, "text/xml");

  const xmlUserTasks = xmlDoc.getElementsByTagName("bpmn:userTask")
  
  for (let i = 0; i < xmlUserTasks.length; i++) {
    let userTask = {};
    userTask.taskName = xmlUserTasks[i].getAttribute("name");

    const xmlUserTaskVariables = xmlUserTasks[i].getElementsByTagName("camunda:formField")

    let userTaskVariables = []
    for (let ii = 0; ii < xmlUserTaskVariables.length; ii++) {
      let variable = {}
      variable.varName = xmlUserTaskVariables[ii].getAttribute("id")
      variable.varType = xmlUserTaskVariables[ii].getAttribute("type")
      const prop = xmlUserTaskVariables[ii].getElementsByTagName("camunda:property")[0]
      variable.varQuestion = prop !== undefined ? prop.getAttribute("value") : console.log(`${variable.varName} misses property Q1`)
      userTaskVariables.push(variable)
    }
    userTask.variables = userTaskVariables;
    userTasks.push(userTask)
  }
  console.log(userTasks)
}

function readFile(file) {

  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    // console.log("1", event.target.result);
    parseXML(event.target.result);
  });
  //reader.readAsDataURL(file);
  reader.readAsText(file);
}

function generateCompleteTaskSegment(userTask) {
  // take first variable per default
  console.log(
`if (assignedTask.name === '${userTask.taskName}') {
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  attributes.lastIntent = Alexa.getIntentName(handlerInput.requestEnvelope);
  attributes.varName = \`${userTask.variables[0].varName}\`;
  speakOutput = \`${userTask.variables[0].varQuestion}\`
}`)
}
// This should be added to CompleteTaskIntentHandler at the bottom:
//   handlerInput.attributesManager.setSessionAttributes(attributes);
// XML
function generateZip() {

  camundaRestEndpoint = document.getElementById("camundaRestEndpoint").value;
  invocationName = document.getElementById("invocationName").value;

  const invocationNameSplit = invocationName.split(" ");
  if (invocationNameSplit.length !== 2) {
    alert("Invocation Name muss mindestens aus zwei Worten bestehen. Siehe auch https://developer.amazon.com/en-US/docs/alexa/custom-skills/choose-the-invocation-name-for-a-custom-skill.html#cert-invocation-name-req")
  } else {
    const zip = new JSZip();
    zip.file(".gitignore", lambdaNodeJSgitignore);
    zip.folder("lambda").file("index.js", createLambdaNodeJS(camundaRestEndpoint, userTasks)).file("package.json", lambdaNodeJSPackageJson);
    zip.folder("skill-package").folder("interactionModels").folder("custom").file("de-DE.json", createInteractionModelDe(invocationName));
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      saveAs(blob, "camunda-alexa-skill.zip");
    });
  }
}



document.querySelector('#create').addEventListener("click", () => {
   // could I also do on file load
  //userTasks.forEach(it => it.variables.length != 0 ? generateCompleteTaskSegment(it) : console.log("no vars"))
  
  generateZip()
})