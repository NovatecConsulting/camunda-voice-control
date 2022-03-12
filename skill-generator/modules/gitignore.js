export default async function createGitignore() {
    return await fetch('resources/templateGitignore.txt').then(data => data.text());
}
