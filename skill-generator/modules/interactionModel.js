export default function createInteractionModelDe(invocationName) {
    return `{
      "interactionModel": {
        "languageModel": {
          "invocationName": "${invocationName}",
          "intents": [
            {
              "name": "AMAZON.CancelIntent",
              "samples": []
            },
            {
              "name": "AMAZON.HelpIntent",
              "samples": []
            },
            {
              "name": "AMAZON.StopIntent",
              "samples": []
            },
            {
              "name": "AMAZON.NavigateHomeIntent",
              "samples": []
            },
            {
              "name": "NewTaskIntent",
              "slots": [],
              "samples": [
                "was muss ich machen",
                "was soll ich tun",
                "gib mir eine aufgabe"
              ]
            },
            {
              "name": "TaskDetailsIntent",
              "slots": [
                {
                  "name": "taskId",
                  "type": "AMAZON.NUMBER"
                }
              ],
              "samples": [
                "was war nochmal aufgabe {taskId}",
                "gib mir details zu aufgabe {taskId}",
                "was muss ich gerade nochmal tun",
                "was muss ich gerade tun"
              ]
            },
            {
              "name": "CompleteTaskIntent",
              "slots": [
                {
                  "name": "taskId",
                  "type": "AMAZON.NUMBER"
                }
              ],
              "samples": [
                "ich bin mir aufgabe {taskId} fertig",
                "aufgabe {taskId} ist fertig",
                "aufgabe ist fertig",
                "ich bin fertig"
              ]
            }
          ],
          "types": []
        },
        "dialog": {
          "intents": [
            {
              "name": "CompleteTaskIntent",
              "confirmationRequired": false,
              "prompts": {},
              "slots": [
                {
                  "name": "taskId",
                  "type": "AMAZON.NUMBER",
                  "elicitationRequired": true,
                  "confirmationRequired": false,
                  "prompts": {
                    "elicitation": "Elicit.Slot.539063591107.512340378493"
                  }
                }
              ],
              "delegationStrategy": "SKILL_RESPONSE"
            },
            {
              "name": "TaskDetailsIntent",
              "confirmationRequired": false,
              "prompts": {},
              "slots": [
                {
                  "name": "taskId",
                  "type": "AMAZON.NUMBER",
                  "elicitationRequired": true,
                  "confirmationRequired": false,
                  "prompts": {
                    "elicitation": "Elicit.Slot.1389421313355.324603669485"
                  }
                }
              ],
              "delegationStrategy": "SKILL_RESPONSE"
            }
          ],
          "delegationStrategy": "ALWAYS"
        },
        "prompts": [
          {
            "id": "Elicit.Slot.539063591107.512340378493",
            "variations": [
              {
                "type": "PlainText",
                "value": "Welche Aufgabe meinst du?"
              }
            ]
          },
          {
            "id": "Elicit.Slot.1389421313355.324603669485",
            "variations": [
              {
                "type": "PlainText",
                "value": "Welche Aufgabe meinst du?"
              }
            ]
          }
        ]
      },
      "version": "1"
    }`;
  }