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


  smsw.ComparisonModel = class {

    constructor(data) {
      let self = this;
      self.comparators = ko.observableArray();
      self.hasComparators = ko.pureComputed(() => {
        return self.comparators().length > 0;
      });
    }

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
        $elem.data('sort', 'ascending').removeClass('fa-sort').removeClass('fa-sort-down').addClass('fa-sort-up');
      } else {
        this.comparators.sort((a, b) => {
          return a.annualCost() > b.annualCost() ? 1 : -1;
        });
        $elem.data('sort', 'descending').removeClass('fa-sort').removeClass('fa-sort-up').addClass('fa-sort-down');
      }
    }

    sortByPrice() {
      const $elem = $('#sort-price');
      const currentSort = $elem.data('sort');
      if(currentSort === 'descending') {
        this.comparators.sort((a, b) => {
          return a.price() < b.price() ? 1 : -1;
        });
        $elem.data('sort', 'ascending').removeClass('fa-sort').removeClass('fa-sort-down').addClass('fa-sort-up');
      } else {
        this.comparators.sort((a, b) => {
          return a.price() > b.price() ? 1 : -1;
        });
        $elem.data('sort', 'descending').removeClass('fa-sort').removeClass('fa-sort-up').addClass('fa-sort-down');
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

      let result = keys.join(";")+"\r\n"+data;
      let fileToSave = new Blob([result], {
        type: "csv",
        name: 'price-comparison.csv'
      });

      saveAs(fileToSave, 'price-comparison.csv');

    }

  };

  $(document).ready(() => {
    smsw.tools = new smsw.ToolsModel();
    ko.applyBindings(smsw.tools, document.querySelector('article'));
    $('#message').focus();
  });

  $(document).ready(() => {
    smsw.comparison = new smsw.ComparisonModel();
    ko.applyBindings(smsw.comparison, document.querySelector('div.comparison'));
    $('#add-comparator').click();
  });

}(jQuery, Drupal, drupalSettings));
