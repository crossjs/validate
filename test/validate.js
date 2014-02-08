define(function (require, exports) {

  'use strict';

  var Validate = require('../src/validate');

  QUnit.start();

  module('Module Validate');
  test('new Validate({})', function() {
    var form = $('<form/>')
        .html('<div class="form-group">' +
          '<input type="text" required minlength="3" maxlength="5">' +
          '</div>')
        .appendTo('#qunit-fixture'),
      input = form.find('input'),
      validate = new Validate({
          form: form
        });
    form.submit();
    equal( form.find('.help-block').text(), '此项必填', '' );
    equal( validate.isValid(), false, '' );

    input.val('1');
    form.submit();
    equal( form.find('.help-block').text(), '请输入至少3个字符', '' );
    equal( validate.isValid(), false, '' );

    input.val('12345');
    form.submit();
    equal( form.find('.help-block').text(), '', '' );
    equal( validate.isValid(), true, '' );

    input.val('123456');
    form.submit();
    equal( form.find('.help-block').text(), '最多输入5个字符', '' );
    equal( validate.isValid(), false, '' );

    form.remove();
  });
  test('new Validate({})', function() {
    var form = $('<form/>')
        .html('<div class="form-group">' +
          '<input type="radio" required value="1" name="testradio">' +
          '<input type="radio" required value="0" name="testradio">' +
          '</div>')
        .appendTo('#qunit-fixture'),
      input = form.find('input'),
      validate = new Validate({
          form: form
        });
    form.submit();
    equal( form.find('.help-block').text(), '此项必填', '' );
    equal( validate.isValid(), false, '' );

    input.eq(0).prop('checked', true);
    form.submit();
    equal( form.find('.help-block').text(), '', '' );
    equal( validate.isValid(), true, '' );

    input.eq(1).prop('checked', true);
    form.submit();
    equal( form.find('.help-block').text(), '', '' );
    equal( validate.isValid(), true, '' );

    input.eq(1).prop('checked', false);
    form.submit();
    equal( form.find('.help-block').text(), '此项必填', '' );
    equal( validate.isValid(), false, '' );

    form.remove();
  });

});