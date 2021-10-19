# pizza-service

An integration of Alexa and [Camunda BPM Platform](https://github.com/camunda/camunda-bpm-platform).

For Camunda I use it integrated in Micronaut ([micronaut-camunda-bpm](https://github.com/camunda-community-hub/micronaut-camunda-bpm)).

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