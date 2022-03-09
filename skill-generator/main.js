import lambdaNodeJSgitignore from './modules/gitignore.js'
import createInteractionModel from './modules/interactionModel.js'
import { createLambdaNodeJS, lambdaNodeJSPackageJson } from './modules/lambda.js'
import en from './locales/en.json'
import de from './locales/de.json'
import i18next from "i18next";

i18next.init({
  lng: 'en',
  debug: true,
  resources: {
    en,
    de
  }
})

let camundaRestEndpoint;
let invocationName;
let language;
let fileList;
let userTasks = [];

function readFile(file) {

  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    parseXML(event.target.result);
  });
  reader.readAsText(file);
}

function parseXML(xmlAsString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlAsString, "text/xml");

  const xmlUserTasks = xmlDoc.getElementsByTagName("bpmn:userTask");
  
  for (let i = 0; i < xmlUserTasks.length; i++) {
    let userTask = {};
    userTask.taskName = xmlUserTasks[i].getAttribute("name");

    const xmlUserTaskVariables = xmlUserTasks[i].getElementsByTagName("camunda:formField");

    let userTaskVariables = []
    for (let ii = 0; ii < xmlUserTaskVariables.length; ii++) {
      let variable = {};
      variable.varName = xmlUserTaskVariables[ii].getAttribute("id");
      variable.varType = xmlUserTaskVariables[ii].getAttribute("type");
      const prop = xmlUserTaskVariables[ii].getElementsByTagName("camunda:property")[0];
      variable.varQuestion = prop !== undefined ? prop.getAttribute("value") : alert(`${variable.varName} misses property Q1`);
      userTaskVariables.push(variable);
    }
    userTask.variables = userTaskVariables;
    userTasks.push(userTask);
  }
}

function generateZip() {

  camundaRestEndpoint = document.getElementById("camundaRestEndpoint").value;
  invocationName = document.getElementById("invocationName").value;
  language = document.getElementById("selectLanguage").value;
  i18next.changeLanguage(language);

  const invocationNameSplit = invocationName.split(" ");
  if (language == 'en' && invocationNameSplit.length !== 2) {
    alert("Invocation Name does not fulfill requirements. See https://developer.amazon.com/en-US/docs/alexa/custom-skills/choose-the-invocation-name-for-a-custom-skill.html#cert-invocation-name-req");
  } else {
    const zip = new JSZip();
    zip.file(".gitignore", lambdaNodeJSgitignore);
    zip.folder("lambda").file("index.js", createLambdaNodeJS(camundaRestEndpoint, userTasks)).file("package.json", lambdaNodeJSPackageJson);
    zip.folder("skill-package").folder("interactionModels").folder("custom").file(`${language}-${language.toUpperCase()}.json`, createInteractionModel(invocationName));
    
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      saveAs(blob, "camunda-alexa-skill.zip");
    });
  }
}

const fileSelector = document.getElementById('file-selector');
const createButton = document.querySelector('#create');

fileSelector.addEventListener('change', (event) => {
    fileList = event.target.files;
    readFile(fileList[0]);
});

createButton.addEventListener("click", () => generateZip());

