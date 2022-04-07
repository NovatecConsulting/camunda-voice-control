# camunda-voice-control

An integration of Amazon Alexa and [Camunda BPM Platform](https://github.com/camunda/camunda-bpm-platform).

I use Camunda BPM Platform integrated in Micronaut ([micronaut-camunda-bpm](https://github.com/camunda-community-hub/micronaut-camunda-bpm)).

## Introduction / Motivation

The following image shows a pizza delivery service process. I took it from the book of Rücker &
Freund. However, we are only looking on the "service view" of the process. So we collapse the customer pool.
Also, we split the task "Bake pizza" in two different tasks and add a gateway which gives a
discount if the pizza got a bit burned.  
![The service view](BPMN_PNG/pizza-service.png "The service view")
> Source: Replicated from Page 98, Rücker, B., & Freund, J. (2019). Praxishandbuch BPMN 2.0: Mit Einführung in DMN. Carl Hanser Verlag GmbH Co KG.

All of these steps will take place within the kitchen. For the moment, we assume that there is only
one pizza chef. And of course there is no computer with a display that the chef can use. So we place
an Amazon Alexa in his kitchen and use the Skill-Generator to create an Alexa Skill based on the above BPMN model.

## Requirements

- Git
- IntelliJ (or other IDE)
- Node + NPM
- Java (which you can also get via IntelliJ)

## Getting started

- Clone the repository with `git clone https://github.com/NovatecConsulting/camunda-voice-control.git`.
- Open a terminal in the cloned folder and enter `npm install`.
- Open the subfolder `pizza-service` with `IntelliJ`. The gradle build process should automatically start. It may take a while to download all dependencies.
- After a successful build, start the application within IntelliJ. You should be able to open the camunda webapps in your browser on `http://localhost:8080`. Do that and log in with `username:admin` and `password:admin`.
- Create an account at [ngrok](https://ngrok.com/) and download the software. Unzip and place it within the root folder of the cloned project. Also, rename the folder to `ngrok`.
- Add the ngrok auth-token (see instruction on their website).
- Open a terminal there, run `npm run ngrok`. The service should provide you a `http` and a `https` endpoint. Open the `https` endpoint in a browser. You should see the camunda welcome screen.
- Open a terminal in the subfolder `skill-generator` and enter `npm install`.
- Start the Skill-Generator with `npm run dev` and open it at `http://localhost:3000` in your browser.
- Create yourself an alexa developer account [here](https://developer.amazon.com/en-US/alexa/alexa-skills-kit#). (You can also use your amazon account. If you own an alexa device, your skills will automatically be available on your device).
- Everything is ready to go. Create a process model, run it through the Skill-Generator and follow its instructions for deployment. Enjoy!

## Contribution

### Conventional Commits

I use conventional [commit messages](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional). You can install it with:

1. `npm install`
2. `npx husky install` // Active hooks
3. `npx husky add .husky/commit-msg 'npx --no-install commitlint --edit $1'` // Add hook

Otherwise, see [here](https://commitlint.js.org/#/guides-local-setup).

### BPMN's to PNG

1. `npm install -g bpmn-to-image`
2. `npm run generate-bpmn-png`
