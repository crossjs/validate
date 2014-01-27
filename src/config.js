define(function (require, exports, module) {

/**
 * 基础库
 * @module Validate
 */

var Config = {
  elements: ['select', 'option', ':checkbox', ':radio', 'textarea', ':text', ':password', ':file'],
  attributes: ['required', 'minlength', 'maxlength', 'min', 'max', 'digits', 'number', 'url', 'equalto', 'minto', 'maxto', 'remote'],
  rules: {
    required: function(elem, value) {
      var name;
      // 如果是单复选框，则特殊判断
      if (/radio|checkbox/.test(elem.prop('type'))) {
        name = elem.prop('name');
        if (name) {
          return !!$(elem.prop('form')).find('[name="' + name + '"]:checked').length;
        }
        return elem.is(':checked');
      }
      return (/\S/).test(value);
    },
    minlength: function(elem, value, min) {
      return value.length ? (value.length >= min) : true;
    },
    maxlength: function(elem, value, max) {
      return value.length ? (value.length <= max) : true;
    },
    min: function(elem, value, min) {
      return parseInt(value, 10) >= min;
    },
    max: function(elem, value, max) {
      return parseInt(value, 10) <= max;
    },
    equalto: function(elem, value, elem2) {
      return value === $(elem.prop('form')).find('[name="' + elem2 + '"]').val();
    },
    minto: function(elem, value, elem2) {
      return parseInt(value, 10) >= parseInt($(elem.prop('form')).find('[name="' + elem2 + '"]').val(), 10);
    },
    maxto: function(elem, value, elem2) {
      return parseInt(value, 10) <= parseInt($(elem.prop('form')).find('[name="' + elem2 + '"]').val(), 10);
    },
    digits: function (elem, value) {
      return !/\D/.test(value);
    },
    number: function(elem, value) {
      return !isNaN(value);
    },
    url: function(elem, value) {
      // 此项目暂不支持https
      return (/^http:\/\/((?:[\w\d][\w\d\-]*)(?:\.[\w\d][\w\d\-]*)*(?:\.\w{2,})+)(?:\/\S*)?$/i).test(value);
    }
  },
  messages: {
    // '_default': {
      'required': '此项必填',
      'equalto': '两次输入的内容不一致，请重新输入',
      'minto': '不能小于{0}',
      'maxto': '不能大于{0}',
      'minlength': '请输入至少{0}个字符',
      'maxlength': '最多输入{0}个字符',
      'password': '密码只能包含ASCII字符',
      'url': '请输入URL地址',
      'digits': '请输入数字',
      'number': '请输入数字',
      'max': '不能大于{0}',
      'min': '不能小于{0}'
    // }
  }
};

return Config;

});
