#!/usr/bin/env node
"use strict";

const { TradeclawCLI } = require("../lib/index.js");

const cli = new TradeclawCLI();
cli.run(process.argv.slice(2));
