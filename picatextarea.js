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
      mode: 'pica'
    },
    _create: function() {
      var me = this;
      var textarea = me.element.get(0);
      
      var events = { onCursorActivity: [], onChange: [] };
      
      if (me.options.showCurrentDataAt) {
        var sca = $(me.options.showCurrentDataAt);
        delete me.options.showCurrentDataAt;
        events.onCursorActivity.push(function(){
          me.showData( me.getDataAt(), sca.empty() );
        });
      }

      events.onChange.push( function(editor,tc) {
        me.highlightLines.call(me, tc.from.line);
      } );

      // utility function
      var caller = function(a) {
        if (a.length == 0) return null;
        if (a.length == 1) return a[0];
        return function() { for (var i = 0; i < a.length; ++i) a[i](); }
      };

      me.options.onCursorActivity = events.onCursorActivity[0];
      for (var e in events) {
        if (me.options[e]) events[e].push(me.options[e]);
        me.options[e] = caller( events[e] );
      }

      me.codemirror = CodeMirror.fromTextArea( textarea, me.options );
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
      // from = (from > 0) ? from-1 : 0; // TODO
      from = 0;
      editor = this.codemirror;
      var lines = editor.getValue().split(/\n/);
      var level = lines[from].charAt(0);
      for(var i=from; i<lines.length; i++) {
         var l = lines[i].charAt(0);
         if ( l.match(/[0-2]/) ) level = l;
         var c = 'pica-level-'+level;
         editor.setLineClass(i,c);
      }
    }
  });
}
