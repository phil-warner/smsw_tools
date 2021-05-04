// tools methods
(function($, Drupal, drupalSettings) {
  'use strict';

  // let smsw = smsw || {};
  const smsw = {};

  smsw.Comparator = class {

    constructor() {
      let self = this;

      // calculation variables, with defaults
      self.deliveryRate = ko.observable(100);
      self.volume = ko.observable(1000);
      self.price = ko.observable(2.9);
      self.supplierName = ko.observable();
      self.deliveredOnly = ko.observable(true);

      // computed observables
      self.monthlyCost = ko.pureComputed(() => {
        let cost = ((Number.parseFloat(this.volume()) * Number.parseFloat(this.price())) / 100).toFixed(2);
        if(!this.deliveredOnly()) {
          cost = (Number.parseFloat(this.deliveryRate()) / 100 * cost).toFixed(2);
        }
        return cost;
      });

      self.annualCost = ko.pureComputed(() => {
        return (Number.parseFloat(self.monthlyCost()) * 12).toFixed(2);
      });
    }

  };

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

      // comparison observables
      self.comparators = ko.observableArray();
      self.hasComparators = ko.pureComputed(() => {
        return self.comparators().length > 0;
      });

      // unicode observables
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

    // comparison methods
    addComparator() {
      this.comparators.push(new smsw.Comparator());
    }

    removeComparator(kodata) {
      smsw.comparison.comparators.remove(kodata);
    }

    sortByCost() {
      const $elem = $('#sort-cost');
      const currentSort = $elem.data('sort');
      if(currentSort === 'descending') {
        this.comparators.sort((a, b) => {
          return a.annualCost() < b.annualCost() ? 1 : -1;
        });
        $elem.data('sort', 'ascending').removeClass('fa-sort').removeClass('fa-sort-desc').addClass('fa-sort-asc');
      } else {
        this.comparators.sort((a, b) => {
          return a.annualCost() > b.annualCost() ? 1 : -1;
        });
        $elem.data('sort', 'descending').removeClass('fa-sort').removeClass('fa-sort-asc').addClass('fa-sort-desc');
      }
    }

    sortByPrice() {
      const $elem = $('#sort-price');
      const currentSort = $elem.data('sort');
      if(currentSort === 'descending') {
        this.comparators.sort((a, b) => {
          return a.price() < b.price() ? 1 : -1;
        });
        $elem.data('sort', 'ascending').removeClass('fa-sort').removeClass('fa-sort-desc').addClass('fa-sort-asc');
      } else {
        this.comparators.sort((a, b) => {
          return a.price() > b.price() ? 1 : -1;
        });
        $elem.data('sort', 'descending').removeClass('fa-sort').removeClass('fa-sort-asc').addClass('fa-sort-desc');
      }
    }

    fadeIn(elem) {
      const $elem = $(elem);
      $elem.hide().fadeIn('fast');
      $elem.find('input').first().focus();
    }

    fadeOut(elem) {
      $(elem).fadeOut('fast');
    }

    exportToCSV() {

      const koJSON = JSON.parse(ko.toJSON(this.comparators()));
      const keys = Object.keys(koJSON[0]);

      // get data for each row
      let data = '';
      koJSON.forEach((item) => {
        let values = [];
        keys.forEach((key) => {
          values.push(item[key]);
        });
        data += values.join(',')+"\r\n";
      });

      let result = keys.join(",")+"\r\n"+data;
      let fileToSave = new Blob([result], {
        type: "csv",
        name: 'price-comparison.csv'
      });

      saveAs(fileToSave, 'price-comparison.csv');

    }
  };

  $(document).ready(() => {
    $.ajax({
      url: '/modules/custom/smsw_tools/html/templates.html',
      method: 'GET',
      success: function(templates) {
        $('body').append('<div style="display:none">' + templates + '</div>');
        smsw.tools = new smsw.ToolsModel();
        ko.applyBindings(smsw.tools, document.querySelector('article'));
        $('#message').focus();
        $('#add-comparator').click();
      }
    });

  });

}(jQuery, Drupal, drupalSettings));
