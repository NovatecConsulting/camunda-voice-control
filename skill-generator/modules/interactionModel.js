import i18next from "i18next";

export default async function createInteractionModel(invocationName) {

    let model = await fetch('../resources/templateInteractionModel.json').then(response => response.json());
    const translation = await fetch(`../locales/${i18next.language}.json`).then(response => response.json());

    model.interactionModel.languageModel.invocationName = invocationName

    model.interactionModel.languageModel.intents.forEach(intent => {
        if (intent.name === "NewTaskIntent") {
            Object.keys(translation.translation.newTaskSamples).forEach(sample => {
                intent.samples.push(i18next.t(`newTaskSamples.${sample}`))
            })
        }
        if (intent.name === "TaskDetailsIntent") {
            Object.keys(translation.translation.taskDetailsSamples).forEach(sample => {
                intent.samples.push(i18next.t(`taskDetailsSamples.${sample}`))
            })
        }
        if (intent.name === "CompleteTaskIntent") {
            Object.keys(translation.translation.completeTaskSamples).forEach(sample => {
                intent.samples.push(i18next.t(`completeTaskSamples.${sample}`))
            })
        }
    })

    model.interactionModel.prompts.forEach(it => {
        it.variations[0].value = i18next.t('taskUnclearPrompt')
    })

    return JSON.stringify(model)
  }