module.exports = {
  apps: [
    { name: "bexemail-api", script: "server.js" },
    { name: "bexemail-worker", script: "src/workers/worker.js" },
    { name: "bexemail-auto-email-worker", script: "src/workers/automationEmailWorker.js" }
  ]
};
