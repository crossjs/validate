define("crossjs/validate/0.1.0/validate-debug", [ "$-debug", "crossjs/class/0.1.0/class-debug", "crossjs/class/0.1.0/super-debug", "./config-debug" ], function(require, exports, module) {
    /**
 * Validate库
 * @module Validate
 */
    "use strict";
    var $ = require("$-debug"), Class = require("crossjs/class/0.1.0/class-debug"), Config = require("./config-debug");
    var htmldecode = function(value) {
        var replacements = {
            "&lt;": "<",
            "&gt;": ">",
            "&amp;": "&",
            "&quot;": '"',
            "&apos;": "'"
        };
        return value.replace(/&(?:lt|gt|amp|quot|apos);/g, function(character) {
            return replacements[character];
        });
    };
    var validateElems = Config.elements.join(","), validateAttrs = Config.attributes, validateRules = Config.rules, errorMessages = Config.messages;
    /**
 * Validate
 * 目前支持单个表单
 * @class Validate
 * @constructor
 */
    var Validate = new Class({
        /**
   * 构造函数
   * @method __construct
   */
        __construct: function(options) {
            var self = this, form = $(options.form);
            if (form.length === 0) {
                return;
            }
            self.rules = options.rules || {};
            self.messages = options.messages || {};
            self.pending = 0;
            self.submitted = false;
            self.errorElements = $();
            self.form = form.attr({
                novalidate: "novalidate"
            }).on("submit", function(e) {
                // e.preventDefault();
                if (self.submitted) {
                    // 判断是否等待异步
                    self.checkPending();
                } else {
                    self.validateForm();
                }
                return false;
            });
            // 事件订阅
            if ($.isPlainObject(options.on)) {
                self.on(options.on);
            }
            if (options.eventType) {
                self.initElements(options.eventType);
            }
        },
        /**
   * 初始化表单元素事件绑定
   * @method initElements
   */
        initElements: function(eventType) {
            var self = this;
            self.form.find(validateElems).off(".validate").on(eventType + ".validate", function() {
                self.validateElem($(this));
            });
        },
        /**
   * 校验整个表单
   * @method validateForm
   */
        validateForm: function() {
            var self = this;
            self.errorElements = $();
            self.submitted = true;
            self.form.find(validateElems).filter(":enabled").each(function() {
                self.validateElem($(this));
            });
            self.checkPending();
        },
        /**
   * 检查异步完成情况并提交表单
   * @method checkPending
   */
        checkPending: function() {
            if (this.pending === 0) {
                this.submitted = false;
                if (this.isValid()) {
                    this.fire("valid");
                } else {
                    this.focusError();
                    this.fire("error");
                }
            }
        },
        /**
   * 清除错误信息
   * @method clearErrors
   */
        clearErrors: function() {
            var self = this;
            self.form.find(validateElems).filter(":enabled").each(function() {
                self.removeError($(this));
            });
        },
        /**
   * 验证单个元素
   * @param {Object} elem 表单元素
   * @method validateElem
   */
        validateElem: function(elem) {
            var self = this, valid = true, name = elem.prop("name"), value = elem.val();
            // 验证前，先移除错误信息
            self.removeError(elem);
            // 验证属性
            $.each(validateAttrs, function(index, rule) {
                var prop = elem.attr(rule);
                if (prop !== undefined && prop !== null && prop !== "") {
                    prop = isNaN(prop) ? prop : +prop;
                    valid = self.checkRule(name, rule, elem, value, prop);
                    if (!valid) {
                        return false;
                    }
                }
            });
            if (valid === false) {
                return;
            }
            // JS里定义的rules
            if (self.rules[name]) {
                $.each(self.rules[name], function(rule, prop) {
                    DEBUG && console.log(rule);
                    prop = isNaN(prop) ? prop : +prop;
                    valid = self.checkRule(name, rule, elem, value, prop);
                    if (!valid) {
                        return false;
                    }
                });
            }
        },
        /**
   * 校验是否符合指定规则
   * @param {Object} name 表单元素
   * @param {String} rule 规则名
   * @param {Object} elem 表单元素
   * @param {String} value 表单元素值
   * @param {function|string} prop 验证方法或基准值
   * @return {boolean}
   * @method checkRule
   */
        checkRule: function(name, rule, elem, value, prop) {
            var valid;
            if (typeof prop === "function") {
                valid = prop.call(this, elem, value);
            } else if (validateRules[rule]) {
                valid = validateRules[rule].call(this, elem, value, prop);
            }
            if (!valid) {
                this.addError(elem, this.getMessage(name, rule, prop));
            }
            return valid;
        },
        /**
   * 获取错误提示信息
   * @param {String} name 表单元素的name值
   * @param {String} rule 当前错误对应的娇艳规则
   * @param {String} prop 校验的基准值，比如maxlength="3"中的”3“
   * @method getMessage
   */
        getMessage: function(name, rule, prop) {
            var text;
            if (this.messages[name]) {
                text = this.messages[name][rule];
            }
            if (!text) {
                text = errorMessages[rule];
            }
            return text ? this.formatMessage(text, prop) : "";
        },
        /**
   * 格式化错误提示信息
   * TODO: 支持prop值为数组的情况
   * @param {String} text 错误提示信息
   * @param {String} prop 校验的基准值
   * @method formatMessage
   */
        formatMessage: function(text, prop) {
            return text.replace(/\{0\}/g, prop);
        },
        /**
   * 使第一个校验失败的元素获得焦点
   * @method focusError
   */
        focusError: function() {
            if (this.errorElements.length) {
                this.errorElements.eq(0).focus();
            }
        },
        /**
   * 显示错误信息
   * 如果需要自定义错误显示方式，则在实例里修改此方法。（不要修改原型）
   * @param {Object} elem 表单元素
   * @param {String} text 错误信息
   * @method addError
   */
        addError: function(elem, text) {
            var wrap = elem.data("wrap"), help = elem.data("help");
            if (!wrap) {
                wrap = elem.closest(".form-group");
                elem.data("wrap", wrap);
            }
            if (!help) {
                help = wrap.find(".help-block");
                // if (help.length > 1)
                //  help = help.filter('[data-for="' + elem.prop('name') + '"]');
                if (help.length === 0) {
                    help = $('<div class="help-block"/>').appendTo(wrap);
                }
                elem.data("help", help);
            }
            wrap.addClass("has-error");
            help.text(text);
            this.errorElements = this.errorElements.add(elem);
        },
        /**
   * 移除错误信息
   * @param {Object} elem 表单元素
   * @method removeError
   */
        removeError: function(elem) {
            var wrap = elem.data("wrap"), help = elem.data("help"), placeholder;
            if (!wrap) {
                wrap = elem.closest(".form-group");
                elem.data("wrap", wrap);
            }
            if (!help) {
                help = wrap.find(".help-block");
                // if (help.length > 1)
                //  help = help.filter('[data-for="' + elem.prop('name') + '"]');
                if (help.length === 0) {
                    help = $('<div class="help-block"/>').appendTo(wrap);
                }
                elem.data("help", help);
            }
            wrap.removeClass("has-error");
            placeholder = help.data("placeholder");
            if (placeholder) {
                help.html(htmldecode(placeholder));
            } else {
                help.empty();
            }
            this.errorElements = this.errorElements.not(elem);
        },
        /**
   * 表单是否校验通过（或从未校验）
   * @param {Object} elem 表单元素
   * @return {boolean}
   * @method isValid
   */
        isValid: function() {
            return this.pending === 0 && this.errorElements.length === 0;
        }
    });
    Validate.addRule = function(rule) {
        $.extend(true, validateRules, rule);
    };
    return Validate;
});
