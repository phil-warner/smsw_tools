// tools methods
(function($, Drupal, drupalSettings) {
  'use strict';

  // let smsw = smsw || {};
  const smsw = {};

  smsw.Character = function (data) {

    switch(data.char) {
      case '\n':
        this.html = '↵';
        break;
      case ' ':
        this.html = '&nbsp;';
        break;
      default:
        this.html = data.char;
    }

    this.cssclass = data.charSet == 'extended' ? 'char char-warning' : data.charSet == 'unicode' ? 'char char-danger' : 'char';
  };

  smsw.ToolsModel = class {

    constructor(data) {
      let self = this;

      self.characters = ko.observableArray();
      self.numCharacters = ko.observable(0);
      self.hasUnicode = ko.observable(false);
      self.msgLength = ko.observable();
      self.message = ko.observable();
      self.$result = $('#result');
      self.$message = $('#message');

      // computed observables
      self.segmentLength = ko.pureComputed(function() {
        return self.hasUnicode() ? 70 : 160;
      });
      self.numSegments = ko.pureComputed(function() {
        let segments = 1;
        if(self.hasUnicode()) {
          segments = self.numCharacters() > 70 ? Math.ceil(self.numCharacters() / 67) : 1;
        } else {
          segments = self.numCharacters() > 160 ? Math.ceil(self.numCharacters() / 153) : 1;
        }
        return segments == 1 ? '1 text message' : segments + ' text messages';
      });

      // subscribers
      self.message.subscribe(function(msg) {

        // reset the observables
        self.characters([]);
        self.hasUnicode(false);

        const msgCharacters = [];
        let msgLength = 0;

        for (var i = 0; i < msg.length; i++) {
          const thisChar = msg.charAt(i);
          const isGSMChar = self.isGSMAlphabet(thisChar);
          const isExtendedGSMChar = self.isExtendedGSM(thisChar);
          const charSet = isExtendedGSMChar ? 'extended' : isGSMChar ? 'gsm' : 'unicode';
          const charLength = charSet == 'gsm' ? 1 : 2;
          msgLength = msgLength + charLength;
          self.numCharacters(msgLength);
          msgCharacters.push(new smsw.Character({
            char: thisChar,
            charSet: charSet
          }));
          if(charSet === 'unicode') {
            self.hasUnicode(true);
          }
        }

        self.characters(msgCharacters);

      });

      // bindings
      $('#check-message').on('click', (e) => {
        e.preventDefault();
        self.renderResult();
      });
    }

    isGSMAlphabet(char) {
      const regexp = new RegExp("^[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!\"#$%&'()*+,\\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*$");
      return regexp.test(char);
    }

    isExtendedGSM(char) {
      const extendedGSM = ['^', '{', '}', '\\', '[', '~', ']', '|', '€'];
      return extendedGSM.includes(char);
    }
  };

  $(document).ready(() => {
    smsw.tools = new smsw.ToolsModel();
    ko.applyBindings(smsw.tools, document.querySelector('article'));
    $('#message').focus();
  });

}(jQuery, Drupal, drupalSettings));
