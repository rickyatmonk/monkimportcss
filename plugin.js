/*! 
monkimportcss
@version: 1.0.0
@date: 25-10-2013
@author: MonkDev

This plugin is to be used in lieu of the native 'importcss'. It does two thing. 
It changes the way that importcss adds span tags as it adds classes from the 'Format' select 
list. It removes this functionality and adds classes to the active element directly. 
Secondly, it adds copies of each class to explicity include common block elements in front 
(e.g. div.myclass). Users can then select the appropriate option to get the desired result 
on block elements.
*/
tinymce.PluginManager.add('monkimportcss', function(editor) {
  var self = this, each = tinymce.each;

  function compileFilter(filter) {
    if (typeof(filter) == 'string') {
      return function(value) {
        return value.indexOf(filter) !== -1;
      };
    } else if (filter instanceof RegExp) {
      return function(value) {
        return filter.test(value);
      };
    }

    return filter;
  }

  function getSelectors(doc, fileFilter) {
    var selectors = [], contentCSSUrls = {};

    function append(styleSheet, imported) {
      var href = styleSheet.href, rules;

      if (!imported && !contentCSSUrls[href]) {
        return;
      }

      if (fileFilter && !fileFilter(href)) {
        return;
      }

      each(styleSheet.imports, function(styleSheet) {
        append(styleSheet, true);
      });

      try {
        rules = styleSheet.cssRules || styleSheet.rules;
      } catch (e) {
        // Firefox fails on rules to remote domain for example: 
        // @import url(//fonts.googleapis.com/css?family=Pathway+Gothic+One);
      }

      each(rules, function(cssRule) {
        if (cssRule.styleSheet) {
          append(cssRule.styleSheet, true);
        } else if (cssRule.selectorText) {
          each(cssRule.selectorText.split(','), function(selector) {
            selectors.push(tinymce.trim(selector));
          });
        }
      });
    }

    each(editor.contentCSS, function(url) {
      contentCSSUrls[url] = true;
    });

    try {
      each(doc.styleSheets, function(styleSheet) {
        append(styleSheet);
      });
    } catch (e) {}

    return selectors;
  }

  function convertSelectorToFormat(selectorText, phantomTag) {
    var format;

    // Parse simple element.class1, .class1
    var selector = /^(?:([a-z0-9\-_]+))?(\.[a-z0-9_\-\.]+)$/i.exec(selectorText);
    if (!selector) {
      return;
    }

    var elementName = selector[1];
    var classes = selector[2].substr(1).split('.').join(' ');


    if(phantomTag){

    
      if (!selector[1] && selector[2]) {

        // This is true in cases where classes have been prefixed with html elements (e.g. 'div.myclass').
        // Since we are aiming to produce a 'div' or 'p' prefix for each class, we only need
        // to concern ourselves with classes that are NOT prefixed with html elements. (e.g. '.myclass').

        format = {
          block: phantomTag,
          title: phantomTag+selectorText,
          classes: classes
        };

      }
    }
    else{

      // element.class - Produce block formats
      if (selector[1]) {
        format = {
          title: selectorText
        };

        if (editor.schema.getTextBlockElements()[elementName]) {
          // Text block format ex: h1.class1
          format.block = elementName;
        } else if (editor.schema.getBlockElements()[elementName]) {
          // Non text block format ex: tr.row
          format.selector = elementName;
        } else {
          // Inline format strong.class1
          format.inline = elementName;
        }
      } else if (selector[2]) {
        // .class - Add the class to any inline item

        /* This is the old method that would add a span to everything
        format = {
          inline: 'span',
          title: selectorText.substr(1),
          classes: classes
        };
        */

        format = {
          selector: 'h1,h2,h3,h4,h5,h6,td,th,li,img,a,span',
          title: selectorText.substr(1),
          classes: classes
        };

      }
    }

    if(format){

      // Append to or override class attribute
      if (editor.settings.importcss_merge_classes !== false) {
        format.classes = classes;
      } else {
        format.attributes = {'class': classes};
      }

    }

    return format;
  }

  // Iterate through the process that initializes a format. This has been made into a function
  // because the process needs to repeat for each block element that we wish to support.
  function initializeAndRegisterFormats(selector, selectorConverter, groups, e, phantomTag){

    var format = selectorConverter.call(self, selector, phantomTag), menu;

    if (format) {
      var formatName = format.name || tinymce.DOM.uniqueId();

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          if (!groups[i].filter || groups[i].filter(selector)) {
            if (!groups[i].item) {
              groups[i].item = {text: groups[i].title, menu: []};
            }

            menu = groups[i].item.menu;
            break;
          }
        }
      }

      editor.formatter.register(formatName, format);

      var menuItem = tinymce.extend({}, e.control.settings.itemDefaults, {
        text: format.title,
        format: formatName
      });

      if (menu) {
        menu.push(menuItem);
      } else {
        e.control.add(menuItem);
      }
    }

    return;

  }

  if (!editor.settings.style_formats) {
    editor.on('renderFormatsMenu', function(e) {
      var settings = editor.settings, selectors = {};
      var selectorConverter = settings.importcss_selector_converter || convertSelectorToFormat;
      var selectorFilter = compileFilter(settings.importcss_selector_filter);

      if (!editor.settings.importcss_append) {
        e.control.items().remove();
      }

      var groups = settings.importcss_groups;
      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          groups[i].filter = compileFilter(groups[i].filter);
        }
      }

      each(getSelectors(editor.getDoc(), compileFilter(settings.importcss_file_filter)), function(selector) {
        if (selector.indexOf('.mce-') === -1) {
          if (!selectors[selector] && (!selectorFilter || selectorFilter(selector))) {
            
            // Register the formats in the default manner, as well as for the common block selectors.
            initializeAndRegisterFormats(selector, selectorConverter, groups, e);
            initializeAndRegisterFormats(selector, selectorConverter, groups, e, 'div');
            initializeAndRegisterFormats(selector, selectorConverter, groups, e, 'p');

            selectors[selector] = true;

          }
        }
      });

      each(groups, function(group) {
        e.control.add(group.item);
      });

      e.control.renderNew();
    });
  }

  // Expose default convertSelectorToFormat implementation
  self.convertSelectorToFormat = convertSelectorToFormat;
});
