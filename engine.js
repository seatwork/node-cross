// Dashed.js - Modified from doT.js
// 2011-2014, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.
const { readFileSync } = require("fs");
const { resolve } = require("path");

const INTERNAL_PREFIX = "$$var_";
const TEMPLATE_CACHE = {};
const TEMPLATE_SYNTAX = {
  partial: /\{\{>\s*(\S+?)\s*\}\}/g,
  block: /\{\{##\s*(\S+?)\s*\}\}/g,
  blockDefine: /\{\{#\s*(\S+?)\s*\}\}([\s\S]*?)\{\{#\s*\}\}/g,
  evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g,
  interpolate: /\{\{=([\s\S]+?)\}\}/g,
  conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
  iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
};

const defaults = {
  strip: true,
  root: "",
  extname: ".html",
  imports: {}
}

function unescape(code) {
  return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
}

function include(file) {
  let tmpl = readFileSync(resolve(defaults.root, file), "utf-8");
  while (TEMPLATE_SYNTAX.partial.test(tmpl)) {
    tmpl = tmpl.replace(TEMPLATE_SYNTAX.partial, (_, f) => readFileSync(resolve(defaults.root, f), "utf-8"));
  }
  return tmpl;
}

function block(tmpl) {
  const blocks = {};
  return tmpl
    .replace(TEMPLATE_SYNTAX.blockDefine, (_, name, block) => {
      blocks[name] = block;
      return "";
    })
    .replace(TEMPLATE_SYNTAX.block, (_, name) => blocks[name]);
}

function compile(tmpl) {
  let sid = 0;
  tmpl = block(tmpl);
  tmpl = (
    "let out='" +
    (defaults.strip
      ? tmpl
        .trim()
        .replace(/<!--[\s\S]*?-->/g, "") // remove html comments
        .replace(/\n\s*\/\/.*/g, "") // remove js comments in line
        .replace(/[\t ]+(\r|\n)/g, "\n") // remove trailing spaces
        .replace(/(\r|\n)[\t ]+/g, "") // leading spaces reduced to " "
        .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") // remove breaks, tabs and JS comments
      : tmpl
    )
      .replace(/'|\\/g, "\\$&")
      .replace(TEMPLATE_SYNTAX.interpolate, (_, code) => `'+(${unescape(code)})+'`)
      .replace(TEMPLATE_SYNTAX.conditional, (_, elseCase, code) => {
        if (code) {
          code = unescape(code);
          return elseCase ? `';}else if(${code}){out+='` : `';if(${code}){out+='`;
        }
        return elseCase ? "';}else{out+='" : "';}out+='";
      })
      .replace(TEMPLATE_SYNTAX.iterate, (_, arr, vName, iName) => {
        if (!arr) return "';} } out+='";
        sid++;
        const defI = iName ? `let ${iName}=-1;` : "";
        const incI = iName ? `${iName}++;` : "";
        const val = INTERNAL_PREFIX + sid;
        return `';const ${val}=${unescape(arr)};if(${val}){${defI}for (const ${vName} of ${val}){${incI}out+='`;
      })
      .replace(TEMPLATE_SYNTAX.evaluate, (_, code) => `';${unescape(code)}out+='`) + "';return out;"
  )
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1")
    .replace(/\+''/g, "");

  try {
    const fn = new Function(tmpl);
    return data => fn.apply(Object.assign({ ...defaults.imports }, data));
  } catch (e) {
    console.log("Could not create a template function:", tmpl);
    throw e;
  }
}

const dashed = function (source, data = {}) {
  let render = TEMPLATE_CACHE[source];
  if (!render) {
    const tmpl = source.endsWith(defaults.extname) ? include(source) : source;
    render = TEMPLATE_CACHE[source] = compile(tmpl);
  }
  return render(data);
}

dashed.compile = compile;
dashed.defaults = defaults;
module.exports = dashed;