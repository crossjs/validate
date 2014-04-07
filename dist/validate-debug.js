define("pandora/validate/1.0.0/validate-debug", [ "$-debug", "pandora/widget/1.0.0/widget-debug", "pandora/base/1.0.0/base-debug", "pandora/class/1.0.0/class-debug", "pandora/events/1.0.0/events-debug" ], function(require, exports, module) {
    /**
 * Validate库
 * @module Validate
 */
    "use strict";
    var $ = require("$-debug"), Widget = require("pandora/widget/1.0.0/widget-debug");
    var htmldecode = function(value) {
        var replacements = {
            lt: "<",
            gt: ">",
            amp: "&",
            quot: '"',
            apos: "'"
        };
        return value.replace(/&(?:lt|gt|amp|quot|apos);/g, function(character, $1) {
            return replacements[$1];
        });
    };
    /**
 * Validate
 * 目前支持单个表单
 * @class Validate
 * @constructor
 */
    var Validate = Widget.extend({
        defaults: {
            // 需要验证的元素
            elements: [ "select", "option", 'input[type="checkbox"]', 'input[type="radio"]', "textarea", 'input[type="text"]', 'input[type="password"]', 'input[type="file"]' ],
            // 默认查找的属性
            attributes: [ "required", "pattern", "minlength", "maxlength", "min", "max", "equalto", "minto", "maxto", "digits", "number", "url", "async" ],
            // 预置的校验函数
            // params: {elem, name, value, rule, prop}
            rules: {
                required: function(params) {
                    var elem = params.elem;
                    // 如果是单复选框，则特殊判断
                    if (/radio|checkbox/.test(elem.prop("type"))) {
                        if (params.name) {
                            return !!this.$('[name="' + params.name + '"]:checked').length;
                        }
                        return elem.is('input[type="checkbox"]');
                    }
                    return /\S/.test(params.value);
                },
                pattern: function(params) {
                    return new RegExp(params.prop).test(params.value);
                },
                minlength: function(params) {
                    var len = params.value.length;
                    return len ? len >= params.prop : true;
                },
                maxlength: function(params) {
                    var len = params.value.length;
                    return len ? len <= params.prop : true;
                },
                min: function(params) {
                    return parseInt(params.value, 10) >= params.prop;
                },
                max: function(params) {
                    return parseInt(params.value, 10) <= params.prop;
                },
                equalto: function(params) {
                    return params.value === this.$('[name="' + params.prop + '"]').val();
                },
                minto: function(params) {
                    return parseInt(params.value, 10) >= parseInt(this.$('[name="' + params.prop + '"]').val(), 10);
                },
                maxto: function(params) {
                    return parseInt(params.value, 10) <= parseInt(this.$('[name="' + params.prop + '"]').val(), 10);
                },
                digits: function(params) {
                    return !/\D/.test(params.value);
                },
                number: function(params) {
                    return !isNaN(params.value);
                },
                url: function(params) {
                    // 此项目暂不支持https
                    return /^https?:\/\/((?:[\w\d][\w\d\-]*)(?:\.[\w\d][\w\d\-]*)*(?:\.\w{2,})+)(?:\/\S*)?$/i.test(params.value);
                },
                // 异步验证，如：从服务端验证、校验动态加载的图片尺寸
                async: function(params) {
                    this.pendingCount++;
                    params.prop.call(this, function(success) {
                        if (success) {
                            this.pendingCount--;
                        } else {
                            this.addError(params);
                        }
                        // 检查
                        this.checkValidation();
                    });
                    return "pending";
                }
            },
            messages: {
                required: "此项必填",
                // TODO: 从title中获取
                pattern: "不符合规则",
                minlength: "请输入至少{0}个字符",
                maxlength: "最多输入{0}个字符",
                min: "不能小于{0}",
                max: "不能大于{0}",
                equalto: "两次输入的内容不一致，请重新输入",
                minto: "不能小于{0}",
                maxto: "不能大于{0}",
                // 'password': '密码只能包含ASCII字符',
                digits: "请输入数字",
                number: "请输入数字",
                url: "请输入URL地址",
                async: "异步校验失败，请检查"
            },
            customRules: {},
            delegates: function() {
                var delegates = {
                    submit: function(e) {
                        e.preventDefault();
                        if (this.data("submitted")) {
                            // 判断是否等待异步
                            this.checkValidation();
                        } else {
                            this.validateForm();
                        }
                    }
                }, // 元素事件
                key = this.option("eventType");
                if (key) {
                    key += " " + this.option("elements").join(",");
                    delegates[key] = function(e) {
                        console.log(arguments);
                        this.validateElem($(e.currentTarget));
                    };
                }
                return delegates;
            },
            events: {
                valid: function() {
                    this.element.submit();
                }
            }
        },
        setup: function() {
            this.state(Validate.STATE.INITIAL);
            this.pendingCount = 0;
            this.errorElements = $();
            this.element.attr({
                novalidate: "novalidate"
            });
        },
        /**
   * 校验整个表单
   *
   * @method validateForm
   */
        validateForm: function() {
            var self = this;
            this.errorElements = $();
            this.data("submitted", true);
            this.$(this.option("elements").join(",")).filter(":enabled").each(function() {
                self.validateElem($(this));
            });
            this.checkValidation();
        },
        /**
   * 验证单个元素
   * @param {Object} elem 表单元素
   * @method validateElem
   */
        validateElem: function(elem) {
            var valid = true, rules, params = {
                elem: elem,
                name: elem.prop("name"),
                value: elem.val()
            };
            // 验证前，先移除错误信息
            this.removeError(params);
            // 验证属性
            $.each(this.option("attributes"), $.proxy(function(index, rule) {
                var prop = elem.attr(rule);
                if (prop !== undefined && prop !== null && prop !== "") {
                    return valid = this.checkRule($.extend({
                        rule: rule,
                        prop: isNaN(prop) ? prop : +prop
                    }, params));
                }
            }, this));
            if (valid === false) {
                return;
            }
            // 自定义的rules
            if (rules = this.option([ "customRules", params.name ].join("/"))) {
                $.each(rules, $.proxy(function(rule, prop) {
                    return this.checkRule($.extend({
                        rule: rule,
                        prop: isNaN(prop) ? prop : +prop
                    }, params));
                }, this));
            }
        },
        /**
   * 校验是否符合指定规则
   *
   * @method checkRule
   *
   * @param {Object} name 表单元素，rule 规则名，elem 表单元素，value 表单元素值，prop 验证方法或基准值
   * @return {boolean}
   */
        checkRule: function(params) {
            var valid, rule = this.option([ "rules", params.rule ].join("/"));
            // params.elem, params.value, params.prop
            if (rule) {
                valid = rule.call(this, params);
            } else if (typeof params.prop === "function") {
                valid = params.prop.call(this, params);
            }
            if (valid === false) {
                this.addError(params);
            }
            return valid;
        },
        /**
   * 检查校验完成情况
   *
   * @method checkValidation
   */
        checkValidation: function() {
            if (this.errorElements.length > 0) {
                this.state(Validate.STATE.ERROR);
                this.data("submitted", false);
                this.focusError();
                return this.fire("error");
            }
            if (this.pendingCount <= 0) {
                this.state(Validate.STATE.VALID);
                this.data("submitted", false);
                return this.fire("valid");
            }
            this.state(Validate.STATE.PENDING);
        },
        /**
   * 清除错误信息
   * @method clearErrors
   */
        clearErrors: function() {
            var self = this;
            this.$(this.option("elements").join(",")).filter(":enabled").each(function() {
                self.removeError({
                    elem: $(this)
                });
            });
        },
        /**
   * 使第一个校验失败的元素获得焦点
   *
   * @method focusError
   */
        focusError: function() {
            this.errorElements.length && this.errorElements.eq(0).focus();
        },
        /**
   * 显示错误信息
   * 如果需要自定义错误显示方式，则在实例里修改此方法。（不要修改原型）
   *
   * @method addError
   *
   * @param {Object} params 元素参数
   * @param {String} [text] 错误信息
   */
        addError: function(params, text) {
            var elem = params.elem, wrap = elem.data("wrap"), help = elem.data("help");
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
            help.text(text || this.getMessage(params));
            this.errorElements = this.errorElements.add(elem);
        },
        /**
   * 获取错误提示信息
   * @param {String} name 表单元素的name值
   * @param {String} rule 当前错误对应的校验规则
   * @param {String} prop 校验的基准值，比如maxlength="3"中的”3“
   * @method getMessage
   */
        getMessage: function(params) {
            var text = this.option([ "customMessages", params.name, params.rule ].join("/")) || this.option([ "messages", params.name, params.rule ].join("/")) || this.option([ "messages", params.rule ].join("/"));
            return text ? text.replace(/\{0\}/g, params.prop) : "";
        },
        /**
   * 移除错误信息
   *
   * @method removeError
   *
   * @param {Object} params 表单元素
   */
        removeError: function(params) {
            var elem = params.elem, wrap = elem.data("wrap"), help = elem.data("help"), placeholder;
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
        }
    });
    Validate.addRule = function(rule) {
        $.extend(true, Validate.prototype.defaults.rules, rule);
    };
    Validate.STATE = {
        INITIAL: -1,
        ERROR: 0,
        VALID: 1,
        PENDING: 2
    };
    module.exports = Validate;
});
