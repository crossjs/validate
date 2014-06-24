define({
  required: function (params) {
    var elem = params.elem;
    // 如果是单复选框，则特殊判断
    if (/radio|checkbox/.test(elem.prop('type'))) {
      if (params.name) {
        return !!this.$('[name="' + params.name + '"]:checked').length;
      }
      return elem.is('input[type="checkbox"]');
    }
    return (/\S/).test(params.value);
  },
  pattern: function (params) {
    return new RegExp(params.prop).test(params.value);
  },
  minlength: function (params) {
    var len = params.value.length;
    return len ? (len >= params.prop) : true;
  },
  maxlength: function (params) {
    var len = params.value.length;
    return len ? (len <= params.prop) : true;
  },
  min: function (params) {
    return parseInt(params.value, 10) >= params.prop;
  },
  max: function (params) {
    return parseInt(params.value, 10) <= params.prop;
  },
  equalto: function (params) {
    return params.value === this.$('[name="' + params.prop + '"]').val();
  },
  minto: function (params) {
    return parseInt(params.value, 10) >= parseInt(this.$('[name="' + params.prop + '"]').val(), 10);
  },
  maxto: function (params) {
    return parseInt(params.value, 10) <= parseInt(this.$('[name="' + params.prop + '"]').val(), 10);
  },
  digits: function (params) {
    return !/\D/.test(params.value);
  },
  number: function (params) {
    return !isNaN(params.value);
  },
  url: function (params) {
    return !(/\S/).test(params.value) || (/^(https?:)?\/\/([a-z0-9][a-z0-9\-]*(\.[a-z0-9][a-z0-9\-]*)*(\.[a-z]{2,})+)(\/\S*)?$/i).test(params.value);
  },
  // 异步验证，如：从服务端验证、校验动态加载的图片尺寸
  async: function (params) {
    this.pendingCount++;

    params.prop.call(this, function (success) {
      if (success) {
        this.pendingCount--;
      } else {
        this.addError(params);
      }
      if (params.form) {
        // 检查
        this.checkValidation();
      }
    }, params);

    return 'pending';
  }
});
