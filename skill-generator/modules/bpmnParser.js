
let userTasks = []

function parseXML(xmlAsString) {
  parser = new DOMParser();
  xmlDoc = parser.parseFromString(xmlAsString, "text/xml");

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

const fileSelector = document.getElementById('file-selector');
let filelist
fileSelector.addEventListener('change', (event) => {
    fileList = event.target.files;
});

const button = document.getElementById("button");
button.addEventListener("click", () => {
  readFile(fileList[0]) // can I also do on file load
  userTasks.forEach(it => it.variables.length != 0 ? generateCompleteTaskSegment(it) : console.log("no vars"))
})

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
