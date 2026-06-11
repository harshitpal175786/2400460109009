"use strict";

const axios = require("axios");
require("dotenv").config();

const LOG_API_URL =
  process.env.LOG_API_URL ||
  "http://4.224.186.213/evaluation-service/logs";

const STACKS = new Set(["backend", "frontend"]);
const LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);

const BACKEND_PACKAGES = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
]);

const FRONTEND_PACKAGES = new Set([
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
]);

const SHARED_PACKAGES = new Set(["auth", "config", "middleware", "utils"]);

function isPackageAllowed(stack, packageName) {
  if (SHARED_PACKAGES.has(packageName)) {
    return true;
  }

  if (stack === "backend") {
    return BACKEND_PACKAGES.has(packageName);
  }

  if (stack === "frontend") {
    return FRONTEND_PACKAGES.has(packageName);
  }

  return false;
}

function validateLogInput(stack, level, packageName, message) {
  if (!STACKS.has(stack)) {
    throw new Error(`invalid stack: ${stack}`);
  }

  if (!LEVELS.has(level)) {
    throw new Error(`invalid level: ${level}`);
  }

  if (!isPackageAllowed(stack, packageName)) {
    throw new Error(`invalid package '${packageName}' for stack '${stack}'`);
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("message must be a non-empty string");
  }
}

async function Log(stack, level, packageName, message) {
  validateLogInput(stack, level, packageName, message);

  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("ACCESS_TOKEN is required for Affordmed logging");
  }

  const response = await axios.post(
    LOG_API_URL,
    {
      stack,
      level,
      package: packageName,
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: Number(process.env.LOG_TIMEOUT_MS || 5000),
    }
  );

  return response.data;
}

module.exports = {
  Log,
};
