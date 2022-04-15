const { readFileSync } = require("fs");
const { resolve } = require("path");

/**
 * Template engine - Modified from doT.js
 * Licensed under the MIT license.
 * @link https://github.com/olado/doT
 */
module.exports = class Engine {

  #prefix = "$$var_";
  #cache = {};

  #syntax = {
    partial: /\{\{>\s*(\S+?)\s*\}\}/g,
    block: /\{\{##\s*(\S+?)\s*\}\}/g,
    blockDefine: /\{\{#\s*(\S+?)\s*\}\}([\s\S]*?)\{\{#\s*\}\}/g,
    evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g,
    interpolate: /\{\{=([\s\S]+?)\}\}/g,
    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
  }

  #defaults = {
    strip: true,
    root: "",
    imports: {}
  };

  default(options) {
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
    let sid = 0;
    tmpl = this.#block(tmpl);
    tmpl = (
      "let out='" +
      (this.#defaults.strip
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
        .replace(this.#syntax.interpolate, (_, code) => `'+(${this.#unescape(code)})+'`)
        .replace(this.#syntax.conditional, (_, elseCase, code) => {
          if (code) {
            code = this.#unescape(code);
            return elseCase ? `';}else if(${code}){out+='` : `';if(${code}){out+='`;
          }
          return elseCase ? "';}else{out+='" : "';}out+='";
        })
        .replace(this.#syntax.iterate, (_, arr, vName, iName) => {
          if (!arr) return "';} } out+='";
          sid++;
          const defI = iName ? `let ${iName}=-1;` : "";
          const incI = iName ? `${iName}++;` : "";
          const val = this.#prefix + sid;
          return `';const ${val}=${this.#unescape(arr)};if(${val}){${defI}for (const ${vName} of ${val}){${incI}out+='`;
        })
        .replace(this.#syntax.evaluate, (_, code) => `';${this.#unescape(code)}out+='`) + "';return out;"
    )
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r")
      .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1")
      .replace(/\+''/g, "");

    try {
      const fn = new Function(tmpl);
      return data => fn.apply(Object.assign({ ...this.#defaults.imports }, data));
    } catch (e) {
      console.log("Could not create a template function:", tmpl);
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
    while (this.#syntax.partial.test(tmpl)) {
      tmpl = tmpl.replace(this.#syntax.partial, (_, f) => readFileSync(resolve(this.#defaults.root, f), "utf-8"));
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
      .replace(this.#syntax.blockDefine, (_, name, block) => {
        blocks[name] = block;
        return "";
      })
      .replace(this.#syntax.block, (_, name) => blocks[name]);
  }

  #unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

};