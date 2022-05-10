const { readFileSync } = require("fs");
const { resolve } = require("path");

const syntax = {
  PARTIAL: /\{\{@\s*(\S+?)\s*\}\}/g,
  BLOCK: /\{\{#\s*(\S+?)\s*\}\}([\s\S]*?)\{\{#\s*\}\}/g,
  BLOCKUSE: /\{\{##\s*(\S+?)\s*\}\}/g,
  EVALUATE: /\{\{([\s\S]+?(\}?)+)\}\}/g,
  INTERPOLATE: /\{\{=([\s\S]+?)\}\}/g,
  CONDITIONAL: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
  ITERATE: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
}

/**
 * Template engine - Modified from doT.js
 * Licensed under the MIT license.
 * @link https://github.com/olado/doT
 */
module.exports = class Engine {

  #cache = {};
  #defaults = {
    strip: true,
    root: "",
    imports: {}
  };

  constructor(options) {
    Object.assign(this.#defaults, options);
  }

  /**
   * Render template file with cache
   * @param {string} file
   * @param {object} data
   * @returns
   */
  view(file, data = {}) {
    let render = this.#cache[file];
    if (!render) {
      const tmpl = this.#include(file);
      render = this.#cache[file] = this.compile(tmpl);
    }
    return render(data);
  }

  /**
   * Render template text
   * @param {string} tmpl
   * @param {object} data
   * @returns
   */
  render(tmpl, data = {}) {
    return this.compile(tmpl)(data);
  }

  /**
   * Complie template to function
   * @param {string} tmpl
   * @returns
   */
  compile(tmpl) {
    tmpl = this.#block(tmpl);
    tmpl = this.#defaults.strip ? this.#strip(tmpl) : tmpl;
    tmpl = tmpl
      .replace(/'|\\/g, "\\$&")
      .replace(syntax.INTERPOLATE, (_, code) => `'+(${this.#unescape(code)})+'`)
      .replace(syntax.CONDITIONAL, (_, elseCase, code) => {
        if (code) {
          code = this.#unescape(code);
          return this.#output(elseCase ? `}else if(${code}){` : `if(${code}){`);
        }
        return this.#output(elseCase ? "}else{ " : "}");
      })
      .replace(syntax.ITERATE, (_, arr, vName, iName) => {
        if (arr) {
          arr = this.#unescape(arr);
          const defI = iName ? `let ${iName}=-1;` : "";
          const incI = iName ? `${iName}++;` : "";
          return this.#output(`if(${arr}){${defI}for (const ${vName} of ${arr}){${incI}`);
        }
        return this.#output("}}");
      })
      .replace(syntax.EVALUATE, (_, code) => `${this.#output(this.#unescape(code))}`);

    const funcBody = ("let out='" + tmpl + "';return out;")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r")
      .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1")
      .replace(/\+''/g, "");

    try {
      const fn = new Function(funcBody);
      return data => fn.apply(Object.assign({ ...this.#defaults.imports }, data));
    } catch (e) {
      console.log("Could not create template function:", funcBody);
      throw e;
    }
  }

  /**
   * Load template from file
   * @param {string} file
   * @returns
   */
  #include(file) {
    let tmpl = readFileSync(resolve(this.#defaults.root, file), "utf-8");
    while (syntax.PARTIAL.test(tmpl)) {
      tmpl = tmpl.replace(syntax.PARTIAL, (_, f) => {
        return readFileSync(resolve(this.#defaults.root, f), "utf-8");
      });
    }
    return tmpl;
  }

  /**
   * Parse blocks
   * @param {string} tmpl
   * @returns
   */
  #block(tmpl) {
    const blocks = {};
    return tmpl
      .replace(syntax.BLOCK, (_, name, block) => { blocks[name] = block; return ""; })
      .replace(syntax.BLOCKUSE, (_, name) => blocks[name]);
  }

  /**
   * Strip breaks, tabs and comments
   * @param {string} tmpl
   * @returns
   */
  #strip(tmpl) {
    return tmpl.trim()
      .replace(/<!--[\s\S]*?-->/g, "")            // remove html comments
      .replace(/\n\s*\/\/.*/g, "")                // remove js comments inline
      .replace(/[\t ]+(\r|\n)/g, "\n")            // remove trailing spaces
      .replace(/(\r|\n)[\t ]+/g, "")              // remove leading spaces
      .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "")  // remove breaks, tabs and js comments
  }

  #output(code) {
    return `';${code}out+='`;
  }

  #unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

}