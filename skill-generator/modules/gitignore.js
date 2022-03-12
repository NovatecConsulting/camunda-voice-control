export default async function createGitignore() {
    return await fetch('ressources/templateGitignore.txt').then(data => data.text());
}
