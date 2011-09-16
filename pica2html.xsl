<?xml version="1.0" encoding="UTF-8"?> 
<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:pica="info:srw/schema/5/picaXML-v1.0"
  xmlns="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="pica"
>

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <!--xsl:param name="base">http://gbv.github.com/picatextarea/</xsl:param-->
  <xsl:param name="base"></xsl:param>

  <!-- Utility method to select specific PICA+ fields -->
  <xsl:key name="datafield" match="pica:datafield" use="
    concat( @tag ,
      substring( 
        concat('/',@occurrence),
        1, 
        number( string-length(@occurrence) &gt; 0 )
        * ( string-length(@occurrence) + 1 )
      )
    )
  " />

  <!-- Utility method to select specific PICA+ subfields -->
  <xsl:key name="subfield" match="pica:subfield" use="
    concat( parent::pica:datafield/@tag,
      substring( 
        concat('/',parent::pica:datafield/@occurrence),
        1, 
        number( string-length(parent::pica:datafield/@occurrence) &gt; 0 )
        * (string-length( parent::pica:datafield/@occurrence ) + 1 )
      ),
      '$',@code
    )" />

  <!-- Basic CSS -->
<xsl:template name="css">
  <style type="text/css"> 
/* styles for this page only */
body {
  font-family: Arial, sans-serif;
  font-size: 1em;
}
h1 { 
  font-weight: bold;
  margin: 0;
  font-size: 1.4em; 
  padding: 0 0 0.2em 0;
}
#footer { 
  padding-top: 1em;
  font-size: 0.8em; 
}
a:link, a:visited {
  color: #00f;
  cursor: pointer;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
 
/* additional styles for codemirror textareas */
.CodeMirror {
  border: 1px solid #ccc;
  height: auto;
  font-family: 'Bitstream Vera Sans Mono','Courier New',monospace;
  font-size: 0.8em;
}
      .CodeMirror-scroll {
        height: auto;
        overflow-y: hidden;
        overflow-x: auto;
        width: 100%;
      }
.CodeMirror-gutter-text {
  background: #eee;
  color: #aaa;
  border-right: 1px solid #ccc;
  padding-right: 5px;
}
  </style>
</xsl:template>
  
  <xsl:template match="/pica:record">
    <xsl:variable name="ppn" select="key('subfield','003@$0')"/>
    <xsl:variable name="title">
      <xsl:choose>
        <xsl:when test="$ppn">
          <xsl:text>ppn:</xsl:text>
          <xsl:value-of select="$ppn"/>
        </xsl:when>
        <xsl:otherwise>PICA+ record</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <title><xsl:value-of select="$title"/></title>

        <script type="text/javascript" src="{$base}lib/jquery-1.5.2.min.js"></script>
        <script type="text/javascript" src="{$base}lib/jquery-ui-1.8.12.custom.min.js"></script>

        <link rel="stylesheet" href="{$base}lib/codemirror.css" />
        <script src="{$base}lib/codemirror.js"></script>
        <link rel="stylesheet" href="{$base}picatextarea.css" />
        <script src="{$base}picatextarea.js"></script>
  <script> 
jQuery(document).ready(function() {
  jQuery('#picaedit').picatextarea({
      //showCurrentDataAt:'#current-data',
      toolbar: ['undo','redo','error'],
      lineNumbers: false,
      images: "<xsl:value-of select="$base"/>img/silk/",
  });
});
</script>
      <xsl:call-template name="css"/>
      </head>
      <body>
        <h1><xsl:value-of select="$title"/></h1>
        <form>
          <textarea id="picaedit"><xsl:apply-templates select="pica:datafield" mode="plain"/></textarea>
          <!--div><tt id="current-data">&#xA0;</tt></div-->
        </form>
        <div id="footer">
          Syntax highlighting via 
          <a href="http://github.com/gbv/picatextarea/">PICA textarea</a>
          based on <a href="http://codemirror.net/">CodeMirror2</a>.
          Feel free to fork!
        </div>
      </body>
    </html>
  </xsl:template>

  <!-- Print PICA/XML as plain Pica -->
  <xsl:template match="pica:datafield" mode="plain">
    <xsl:value-of select="@tag"/>
    <xsl:if test="@occurrence">
      <xsl:text>/</xsl:text>
      <xsl:value-of select="@occurrence"/>
    </xsl:if>
    <xsl:text> </xsl:text>
    <xsl:apply-templates select="pica:subfield" mode="plain"/>
    <xsl:text>&#xA;</xsl:text>
  </xsl:template>

  <xsl:template match="pica:subfield" mode="plain">
    <xsl:text>$</xsl:text>
    <xsl:value-of select="@code"/>
    <xsl:value-of select="."/> <!-- TODO: replace $ => $$ -->
  </xsl:template>

</xsl:stylesheet>
