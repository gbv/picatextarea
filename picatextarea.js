/**
 * Defines PICA+ syntax highlighting with error detection for CodeMirror 2.
 */
CodeMirror.defineMode("pica", function() {
  var tagpattern = /^([0-2][0-9][0-9][A-Z@])(\/([0-9][0-9]))?$/;
  return {
    startState: function() {
      return { lev: 0, mode: 0  };
    },
    token: function(stream,state) {
      if (stream.sol()) { // tag
        state.mode = 0;
        if (stream.eatWhile(/[^\s$]/)) {
          var match = tagpattern.exec(stream.current());
          if ( match ) {
            var lev = parseInt(match[1].charAt(0));
            if ((lev == 0 && state.lev > 0) || (lev == 2 && state.lev == 0)) {
              state.lev = lev;
              return "pica-tag-wrong";
            }
            state.lev = lev;
            if (!stream.match(/^\s*\$/,false)) {
              return "pica-error";
            }
            return "pica-tag";
          } else {
            return "pica-error";
          }
        }
      } else if (state.mode == 2 ) { // value
        state.mode = 1;
        while( stream.skipTo('$') ) {
          if ( stream.match('$$') ) {
            stream.next(); stream.next();
          } else {
            return "pica-value";
          }
        }
        stream.skipToEnd();
        return "pica-value";
      } else { // subfield
        if (state.mode == 0 && stream.eatSpace()) return;
        if (stream.next() == "$") {
          if ( stream.eat(/[a-zA-Z0-9]/) ) {
             state.mode = 2;
             var look = stream.peek(); // empty subfield
             if (!look || (look == '$' && !stream.match(/^$[^$]/))) {
               return "pica-error";
             }
             return "pica-sf";
          }
        }
      }
      stream.skipToEnd();
      return "pica-error";
    }
  };
});

/**
 * PICA+ editor Widget to apply to a textarea
 */
if (typeof jQuery != 'undefined') if (typeof jQuery.widget != 'undefined') {
  var $ = jQuery;
  $.widget('ui.picatextarea',{
    options: {
      lineNumbers: true,
      mode: 'pica',
      toolbar: false,
      images: './img/silk/',
      // levelBackground: true,
    },
    _create: function() {
      var me = this;
      var textarea = me.element.get(0);
      
      this.images = this.options.images;
      delete this.options.images;
      
      this.customOnChange = this.options.onChange;
      this.options.onChange = function(editor,tc) { me.onChange(tc); };

      this.customOnCursorActivity = this.options.onCursorActivity;      
      this.options.onCursorActivity = function(editor,tc) { me.onCursorActivity(); };     
            
      if (me.options.showCurrentDataAt) {
        this.showCurrentDataAt = $(me.options.showCurrentDataAt);
        delete me.options.showCurrentDataAt;
      }
 
      this.loadVia = this.options.load;
      
      // known toolbar elements
      this.toolbarElements = {
        'undo': {type:"button", title:"Undo", image:"arrow_undo.png", action: function() {me.codemirror.undo();} },
        'redo': {type:"button", title:"Redo", image:"arrow_redo.png", action: function() {me.codemirror.redo();} },
        'load': {type:"button", title:"Load", image:"page_white_get.png", action: function() {me.loadValue();} },
        'save': {type:"button", title:"Save", image:"page_white_put.png", action: function() {me.saveValue();} },
        'name': {type:"input", size:20, label:"id:"},
        'error': {type:"info" },
        // TODO: 'sort', 'validate', 'about', ...
      };
      
      var toolbarSelect = this.options.toolbar;
      delete this.options.toolbar;
      
      if (toolbarSelect) {
        if (typeof toolbarSelect != "object")
          toolbarSelect = ["undo","redo","name","load","save"]; // default toolbar
        $('<div>').prependTo( textarea.parentNode ).append(
          this.toolbar = $('<div class="picatextarea-clearfix picatextarea-toolbar">')
        );        
        for (var i = 0; i < toolbarSelect.length; i++) {
          var spec = toolbarSelect[i]
          var element = this.createToolbarElement(spec);
          if (!element) continue;
          // TODO: allow custom elements to be this roles
          if (typeof spec == "string") {
              if (spec == "undo")
                (this.undoButton = element).addClass('inactive');
              else if (spec == "redo") 
                (this.redoButton = element).addClass('inactive');
              else if (spec == "name")   
                this.nameInput = element.find('input');
              else if (spec == "error")
                this.errorInfo = element;
          }
          this.toolbar.append(element);
        }
      }

      me.codemirror = CodeMirror.fromTextArea( textarea, me.options );
      var wrapper = $(me.codemirror.getWrapperElement());
      wrapper.addClass('picatextarea');
      if ( this.toolbar ) wrapper.css('border-top','0px');
      me.highlightLines(0);
    },   
    getDataAt: function(line,ch) {
      var editor = this.codemirror;
      
      if (line == null) { 
        var cursor = editor.getCursor();
        line = cursor.line; ch = cursor.ch;
      } else if (ch == null && typeof line.line != "number") {
        line = line.line; ch = line.ch;
      }
      ch = (ch == null ? 1 : ch+1);
           
      var tok = editor.getTokenAt({line:line,ch:1});      
      if ( !tok ) // || (tok.className != "pica-tag" && tok.className != "pica-tag-wrong") )
        return {valid:false};
        
      var obj = { 
        valid: (tok.className == "pica-tag"),
        tag: tok.string
      };
  
      tok = editor.getTokenAt({line:line,ch:ch});
      if (tok.className == "pica-value") {
        obj.value = tok.string;
        tok = editor.getTokenAt({line:line,ch:tok.start-1})
      }
      if (tok && tok.className=="pica-sf") {
        obj.subfield = tok.string;
        if ( !obj.value ) {
          tok = editor.getTokenAt({line:line,ch:tok.end+1})
          obj.value = tok.string;
        }
      }
        
      return obj;
    },
    getValue: function() { return this.codemirror.getValue(); },
    showData: function(data, element) {
      element = $(element);
      if(data.tag) {
        var type = data.valid ? "pica-tag" : "pica-tag-wrong";
        $('<span class="'+type+'">').text(data.tag).appendTo(element);
      }
      if(data.subfield) {
        $('<span class="pica-sf">').text(data.subfield).appendTo(element);
      }
      if(data.value) {
        $('<span class="pica-value">').text(data.value).appendTo(element);
      }      
    },
    highlightLines: function(from) {
      var editor = this.codemirror;
      var lines = editor.getValue().split(/\n/);
      var level = lines[from].charAt(0);
      for(var i=from; i<lines.length; i++) {
         var l = lines[i].charAt(0);
         if ( l.match(/[0-2]/) ) level = l;
         var c = 'pica-level-'+level;
         editor.setLineClass(i,c);
      }
    },
    onChange: function(tc) {
      this.highlightLines(0); // TODO: tc.from.line
      if (this.undoButton || this.redoButton) {
        var his = this.codemirror.historySize();
        if (this.undoButton && his['undo'] > 0) {
          this.undoButton.removeClass('inactive');
        } else {
          this.undoButton.addClass('inactive');
        }
        if (this.redoButton && his['redo'] > 0) {
          this.redoButton.removeClass('inactive');
        } else {
          this.redoButton.addClass('inactive');
        }
      }
      if (this.customOnChange) this.customOnChange();
    },
    onCursorActivity: function() {
      if (this.showCurrentDataAt) {
        this.showData( this.getDataAt(), this.showCurrentDataAt.empty() );
      }      
      if (this.customOnCursorActivity) this.customOnCursorActivity();
    },           
    createToolbarElement: function(spec) {
      if (!this.toolbar) return;

      if (typeof spec == "string") {
        var name = spec;
        spec = this.toolbarElements[spec];
        if (spec) spec.name = name;
      }  
      if (typeof spec != "object" || typeof spec.type == "undefined") return spec;

      var element;
      if (spec.type == "button") {
        var button = $('<a href="#" class="picatextarea-toolbar-button">');
        button.attr('title',spec.title);
        var action = spec.action;
        button.click( function() { action(); return false; } );
    
        var img = $('<img border="0">').attr('src',this.images+spec.image);
        button.append(img);
        return button;
      } else if (spec.type == "input") {
        var inputWrap = $('<div class="picatextarea-toolbar-element">');
        if (spec.label) {
          inputWrap.append( $('<label>').text(spec.label) );
        }
        var size = typeof spec.size == "number" ? spec.size : 12;
        var input = $('<input type="text">').attr('size',size);
        inputWrap.append( input );
        return inputWrap;
      } else if (spec.type == "info") {
        var info = $('<div class="picatextarea-toolbar-info">');
        if (spec.name == "error") info.addClass("picatextarea-toolbar-error");
        info.text("");
        return info;
      }
    },
    showError: function(msg) {
        if (this.errorInfo) this.errorInfo.text(msg).show();
        else alert(msg);
    },
    noError: function() {
        if (this.errorInfo) this.errorInfo.text("").hide();
    },
    loadValue: function() {
      if (!this.loadVia) return;
      var me = this;
      var id = this.nameInput ? this.nameInput.val() : null;
      var callback = function(response) {
        if (typeof response != "object") response = {error:"response broken"};
        me.noError();
        if (response.error) me.showError(response.error);
        else if (response.value) {
          me.codemirror.setValue(response.value);
//          me.justLoaded = true;
        }
      };
      this.loadVia(callback,id);
    },
    saveValue: function() { /* ...TODO... */ }
  });
}
