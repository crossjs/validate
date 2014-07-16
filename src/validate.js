define(function (require, exports, module) {

/**
 * Validate库
 * @module Validate
 */

'use strict';

var $ = require('$'),
    Widget = require('widget');

/**
 * Validate
 * 目前支持单个表单
 * @class Validate
 * @constructor
 */
var Validate = Widget.extend({

  defaults: {
    classPrefix: '',
    // 需要验证的元素
    elements: ['select', 'textarea', 'input[name]'],
    // 默认查找的属性
    attributes: ['required', 'pattern', 'minlength', 'maxlength', 'min', 'max', 'equalto', 'minto', 'maxto', 'digits', 'number', 'url', 'async'],
    // 预置的校验函数
    // params: {elem, name, value, rule, prop}
    rules: require('./rules'),
    messages: require('./messages'),

    // UI 配置
    wrapHook: function (elem) {
      var wrap = elem.data('validate-wrap');

      if (!wrap) {
        wrap = elem.closest('.form-group');

        if (wrap.length === 0) {
          wrap = elem.parent();
        }

        elem.data('validate-wrap', wrap);
      }

      return wrap;
    },
    helpHook: function (elem) {
      var wrap,
        help = elem.data('validate-help');

      if (!help) {
        wrap = elem.data('validate-wrap');
        help = wrap.find('.help-block');

        if (help.length === 0) {
          help = $('<span class="help-block"></span>').appendTo(wrap);
        }

        elem.data('validate-help', help);
      }

      return help;
    },

    errorClass: 'has-error',

    customRules: { },
    customMessages: { },

    delegates: function () {
      var delegates = {
            'submit': function (e) {
              if (!e.isDefaultPrevented()) {
                e.preventDefault();
                this.submit();
              }
            }
          },
          elements = this.option('elements').join(','),
          // 元素事件
          key = this.option('eventType');

      // 清除错误提示
      delegates['keydown ' + elements] = function (e) {
        this.removeError({
          elem: $(e.currentTarget)
        });
      };

      // 清除错误提示
      delegates['mousedown ' + elements] = function (e) {
        this.removeError({
          elem: $(e.currentTarget)
        });
      };

      if (key) {
        delegates[key + ' ' + elements] = function (e) {
          this.validateElem($(e.currentTarget), false);
        };
      }

      return delegates;
    }
  },

  setup: function () {
    var self = this,
      attributes = self.option('attributes'),
      rules = self.option('rules'),
      messages = self.option('messages');

    // 混入自定义规则，仅全局（非指定元素 name）规则
    $.each(self.option('customRules'), function (key, func) {
      if (typeof func === 'function') {
        // 扩充 attributes
        if ($.inArray(key, attributes) === -1) {
          attributes.push(key);
        }

        // 扩充/替换 rules
        rules[key] = func;
      }
    });

    // 混入自定义错误信息，仅全局（非指定元素 name）错误信息
    $.each(self.option('customMessages'), function (key, value) {
      if (typeof value === 'string') {
        messages[key] = value;
      }
    });

    self.pendingCount = 0;
    self.errorElements = $();

    self.element.attr({
      novalidate: 'novalidate'
    });
  },

  submit: function () {
    if (this.data('submitted')) {
      // 判断是否等待异步
      this.checkValidation();
    } else {
      this.validateForm();
    }
  },

  /**
   * 校验整个表单
   *
   * @method validateForm
   */
  validateForm: function () {
    var self = this;

    self.errorElements = $();

    // 标记提交
    self.data('submitted', true);

    // 验证元素
    self.$(self.option('elements').join(','))
      .filter(':enabled')
      .each(function () {
        if (this.name) {
          self.validateElem($(this), true);
        }
      });

    // 检查验证
    self.checkValidation();
  },

  /**
   * 验证单个元素
   * @param {Object} elem 表单元素
   * @param {Boolean} form 是否来自全表校验请求
   * @method validateElem
   */
  validateElem: function (elem, form) {
    var self = this,
        valid = true,
        rules,

      params = {
        elem: elem,
        name: elem.prop('name'),
        value: elem.val(),
        form: form
      };

    // 验证前，先移除错误信息
    self.removeError(params);

    // 验证属性
    $.each(self.option('attributes'), function (index, rule) {
      var prop = elem.attr(rule);
      if (prop !== undefined && prop !== null && prop !== '') {
        return (valid = self.checkRule($.extend({
            rule: rule,
            prop: isNaN(prop) ? prop : +prop
          }, params)));
      }
    });

    if (valid === false) {
      return;
    }

    // 自定义的rules
    if ((rules = self.option(['customRules', params.name].join('/')))) {
      $.each(rules, function (rule, prop) {
        return (valid = self.checkRule($.extend({
            rule: rule,
            prop: isNaN(prop) ? prop : +prop
          }, params)));
      });
    }

    if (valid === true) {
      self.fire('elemValid', elem, form);
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
  checkRule: function (params) {
    var valid, rule = this.option(['rules', params.rule].join('/'));

    if (rule) {
      valid = rule.call(this, params);
    } else if (typeof params.prop === 'function') {
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
  checkValidation: function () {
    var self = this;

    if (self.errorElements.length > 0) {
      self.data('submitted', false);
      self.fire('error') && self.errorElements.eq(0).focus();
    } else if (self.pendingCount <= 0) {
      self.data('submitted', false);
      self.fire('valid') && self.element[0].submit();
    }
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
  addError: function (params, text) {
    var self = this,
      elem = params.elem;

    self.option('wrapHook').call(self, elem)
      .addClass(self.option('errorClass'));

    self.option('helpHook').call(self, elem)
      .html(text || self.getMessage(params));

    self.errorElements = self.errorElements.add(elem);

    self.fire('elemError', elem);
  },

  /**
   * 移除错误信息
   *
   * @method removeError
   *
   * @param {Object} params 表单元素
   */
  removeError: function (params) {
    var self = this,
      elem = params.elem;

    self.errorElements = self.errorElements.not(elem);

    self.option('wrapHook')(elem)
      .removeClass(self.option('errorClass'));

    self.option('helpHook')(elem)
      .empty();
  },

  /**
   * 获取错误提示信息
   * @param {String} name 表单元素的name值
   * @param {String} rule 当前错误对应的校验规则
   * @param {String} prop 校验的基准值，比如 `maxlength="3"` 中的 `3`
   * @method getMessage
   */
  getMessage: function (params) {
    var text = this.option(['customMessages', params.name, params.rule].join('/')) ||
      this.option(['messages', params.rule].join('/'));

    return text ? text.replace(/\{0\}/g, params.prop) : '';
  }

});

Validate.addRule = function (rule) {
  $.extend(true, Validate.prototype.defaults.rules, rule);
};

module.exports = Validate;

});
