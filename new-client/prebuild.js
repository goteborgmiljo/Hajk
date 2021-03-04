const { execSync } = require("child_process");
const fs = require("fs");

const envLocalFile = ".env.local";

function cleanUpNewlines() {
  data = data.replace(/[\n]{2,}/g, "\n");
}

let data =
  fs.readFileSync(envLocalFile, { flag: "a+" }).toString().trim() + "\n";
cleanUpNewlines();

function updateGitHash(params) {
  const key = "REACT_APP_GIT_HASH";
  const regex = new RegExp(`${key}=.*`);

  let gitHash = execSync("git rev-parse HEAD").toString();

  if (data.indexOf(key) === -1) {
    data += `${key}=0`;
  }

  data = data.replace(regex, `${key}=${gitHash}\n`);
}

function updateBuildDate() {
  const key = "REACT_APP_BUILD_DATE";
  const regex = new RegExp(`${key}=.*`);
  if (data.indexOf(key) === -1) {
    data += `${key}=0`;
  }
  data = data.replace(regex, `${key}=${new Date().toISOString()}\n`);
}

function updateAppVersion() {
  const key = "REACT_APP_VERSION=$npm_package_version\n";
  if (data.indexOf(key) === -1) {
    data += key;
  }
}

function updateAppName() {
  const key = "REACT_APP_NAME=$npm_package_name\n";
  if (data.indexOf(key) === -1) {
    data += key;
  }
}

function writeToEnvLocal() {
  cleanUpNewlines();
  fs.writeFileSync(envLocalFile, data);
}

updateAppName();
updateAppVersion();
updateBuildDate();
updateGitHash();
writeToEnvLocal();