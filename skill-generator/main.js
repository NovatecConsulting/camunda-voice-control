import createGitignore from './modules/gitignore.js'
import createInteractionModel from './modules/interactionModel.js'
import {createLambdaNodeJS, createPackageJson } from './modules/lambda.js'
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
}).then( () => console.debug('i18next initialized'))

let camundaRestEndpoint;
let invocationName;
let language;
let fileList;
let userTasks = [];

function readFile(file) {

  const fileReader = new FileReader();
  fileReader.addEventListener('load', (event) => {
    parseXML(event.target.result);
  });
  fileReader.readAsText(file);
}

function parseXML(xmlAsString) {
  const domParser = new DOMParser();
  const xmlDoc = domParser.parseFromString(xmlAsString, "text/xml");

  const xmlUserTasks = Array.from(xmlDoc.getElementsByTagName("bpmn:userTask"));

  xmlUserTasks.forEach( xmlUserTask => {
    let userTask = {};
    userTask.taskName = xmlUserTask.getAttribute("name");

    const xmlUserTaskVariables = Array.from(xmlUserTask.getElementsByTagName("camunda:formField"));

    let userTaskVariables = [];
    xmlUserTaskVariables.forEach( xmlUserTaskVariable => {
      let variable = {};
      variable.varName = xmlUserTaskVariable.getAttribute("id");
      variable.varType = xmlUserTaskVariable.getAttribute("type");
      const camundaProperties = Array.from(xmlUserTaskVariable.getElementsByTagName("camunda:property"));
      const q1 = camundaProperties.find(element => element.id.toUpperCase().normalize() === "Q1");
      variable.varQuestion = q1 !== undefined ? q1.getAttribute("value") : alert(`${variable.varName} misses property Q1`);
      userTaskVariables.push(variable);
    });
    userTask.variables = userTaskVariables;
    userTasks.push(userTask);
  });
}

async function generateZip() {

  camundaRestEndpoint = document.getElementById("camundaRestEndpoint").value;
  invocationName = document.getElementById("invocationName").value;
  language = document.getElementById("selectLanguage").value;
  await i18next.changeLanguage(language);

  const invocationNameSplit = invocationName.split(" ");

  // FIX have to use .normalize() so that I can use '===' for the comparison
  if (language.normalize() === 'en' && invocationNameSplit.length !== 2) {
    alert("Invocation Name does not fulfill requirements. See https://developer.amazon.com/en-US/docs/alexa/custom-skills/choose-the-invocation-name-for-a-custom-skill.html#cert-invocation-name-req");
  } else {
    const zip = new JSZip();
    zip.file(".gitignore", createGitignore());
    zip.folder("lambda").file("index.js", createLambdaNodeJS(camundaRestEndpoint, userTasks)).file("package.json", createPackageJson());
    if (language.normalize() === 'en') {
      zip.folder("skill-package").folder("interactionModels").folder("custom").file(`en-US.json`, createInteractionModel(invocationName));
    } else if (language.normalize() === 'de') {
      zip.folder("skill-package").folder("interactionModels").folder("custom").file(`de-DE.json`, createInteractionModel(invocationName));
    }
    
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
