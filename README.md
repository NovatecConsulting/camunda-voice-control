# pizza-service

An integration of Alexa and [Camunda BPM Platform](https://github.com/camunda/camunda-bpm-platform).

For Camunda I use it integrated in
Micronaut ([micronaut-camunda-bpm](https://github.com/camunda-community-hub/micronaut-camunda-bpm)).

## The process

The following image shows the whole process. I took it from the book of Rücker & Freund.
![The pizza service process](BPMN/PNG/full_process_overview_pizza_service.png "The pizza service process")
> Source: Replicated from Page 98, Rücker, B., & Freund, J. (2019). Praxishandbuch BPMN 2.0: Mit Einführung in DMN. Carl Hanser Verlag GmbH Co KG.

However, we are only looking on the "service view" of the process. So we collapse the customer pool.
![The service view](BPMN/PNG/pizza_service_customer_closed.png "The service view")

Next, we focus on the user task "Bake pizza". This will be the part of the process which we are
going to control via voice. When baking a pizza we introduce some steps that need to be done:

- View the order
- Start the preparation of the pizza
- Put the pizza in the oven
- Put the pizza in a carton

All of these steps will take place within the kitchen. For the moment, we assume that there is only
one pizza chef.

## Contribution

### JAVA JDK

I use Open JDK 17.

### Conventional Commits

I use
conventional [commit messages](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)
. You can install it with:

1. `npm install`
2. `npx husky install` // Active hooks
3. `npx husky add .husky/commit-msg 'npx --no-install commitlint --edit $1'` // Add hook

Otherwise see here: https://commitlint.js.org/#/guides-local-setup

### BPMN's to PNG
1. `npm install -g bpmn-to-image`
2. `npm run generate-bpmn-png`
