///////////////////////////////////////////
// Helper constants
///////////////////////////////////////////
var sin60 = Math.sin(Math.PI / 3);
var sin30 = Math.sin(Math.PI / 6);
var cos60 = Math.cos(Math.PI / 3);
var cos30 = Math.cos(Math.PI / 6);
var rotangle = Math.atan(Math.cos(Math.PI / 6) / (3 * (1 + Math.sin(Math.PI / 6))));
var rotangle2 = Math.atan((1 + Math.sin(Math.PI / 6)) / (5.5 * Math.cos(Math.PI / 6)));

///////////////////////////////////////////
// Helper Functions
///////////////////////////////////////////

function percentage(value, minval, maxval) {
  return (100 * (value - minval) / (maxval - minval)).toFixed(2);
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined' ?
        args[number] :
        match;
    });
  };
}

function rotatePoint(p, angle) {
  var m = [
    [Math.cos(angle), -Math.sin(angle)],
    [Math.sin(angle), Math.cos(angle)]
  ];
  pr = [p[0] * m[0][0] + p[1] * m[0][1], p[0] * m[1][0] + p[1] * m[1][1]];
  return pr;
}

function calcHexVertex(r) {
  // in d3 positive is down (0,0) is top left corner
  // This forces to invert signs
  var initPoint = [r, 0];
  var hexPoints = [];
  hexPoints.push(initPoint);
  for (var i = 1; i < 6; i++) {
    hexPoints.push(rotatePoint(initPoint, Math.PI * i / 3));
  }
  return hexPoints;
}


function getDivWidth(div) {
  var width = d3.select(div)
    // get the width of div element
    .style('width')
    // take of 'px'
    .slice(0, -2)
  // return as an integer
  return Math.round(Number(width))
}

function getDivHeight(div) {
  var width = d3.select(div)
    // get the width of div element
    .style('height')
    // take of 'px'
    .slice(0, -2)
  // return as an integer
  return Math.round(Number(width))
}

function lineFromPoints() {}

///////////////////////////////////////////
// The class of the Modules Charts
///////////////////////////////////////////
class ModuleChart {
  constructor(title, id, parentId, urlDataUpdate) {
    this.title = title;
    this.sizes = {
      'width': 1000,
      'height': 1200,
      'barHeight': 800
    }
    this.id = id;
    this.parentId = parentId;
    this.urlDataUpdate = urlDataUpdate;
    this.urlConfigModules = "https://raw.githubusercontent.com/otger/d3hex/master/data/json/modules.json";
    this.hexRadius = 31;
    this.hexVertex = calcHexVertex(this.hexRadius);
    this.data = {
      modules: [],
      timestamp: null
    };
    this.svgId = 'svg' + this.id;
    this.svgGroupIds = {
      modulesGroupId: 'svgModulesGroup_' + this.id,
      scaleGroupId: 'svgScaleGroup_' + this.id,
      titleGroupId: 'svgTitleGroup_' + this.id,
      dateGroupId: 'svgDateGroup_' + this.id,
      tooltipGroupId: 'svgTooltipGroup_' + this.id
    }
    this.svgGroups = {};
    this.colorScale = {
      'scale': d3.scaleLinear()
        .domain([-20, 5, 40, 60])
        .range(['rgb(14, 14, 214)', 'rgb(14, 214, 141)', 'rgb(4, 165, 77)', 'rgb(188, 1, 1)']),
      'valuesArray': [-20, 5, 40, 60],
      'colorsArray': ['rgb(14, 14, 214)', 'rgb(14, 214, 141)', 'rgb(4, 165, 77)', 'rgb(188, 1, 1)'],
      'linearGradientId': 'linear-gradient' + this.id
    }

    this._elements = {};

    this.lineFromPoints = d3.line()
      .x(function (d) {
        return d[0];
      })
      .y(function (d) {
        return d[1];
      });


    this.createSvgGroups();

    this.createModules();
    this.createColorScale();
    this.createTitle();
    this.createDate();

  }

  createTitle() {
    this._elements.chartTitle = this.svgGroups.titleGroup.append("text")
      .attr("x", (this.sizes.width / 2))
      .attr("y", 95)
      .attr("class", "chartTitle")
      .attr("text-anchor", "middle")
      .text(this.title);
  }
  createDate() {
    this._elements.updateDate = this.svgGroups.dateGroup.append("text")
      .attr("x", 30)
      .attr("y", 1150)
      .attr("class", "chartDate")
      .text('Not available');
  }

  createSvgGroups() {
    this.svgGroups.svg = d3.select(this.parentId).append("svg")
      .attr("width", '100%')
      .attr("height", '100%')
      .attr('id', this.svgId)
      .attr('viewBox', '0 0 ' + this.sizes.width + ' ' + this.sizes.height);
    //    .attr('preserveAspectRatio', 'xMinYMin')
    this.svgGroups.modulesGroup = this.svgGroups.svg
      .append("g")
      .attr("id", this.modulesGroupId)
      .attr("transform", "translate( 450, 600)");
    this.svgGroups.colorScaleGroup = this.svgGroups.svg
      .append("g")
      .attr("id", this.scaleGroupId)
      .attr("transform", "translate( 910, 0)");
    this.svgGroups.titleGroup = this.svgGroups.svg
      .append("g")
      .attr("id", this.titleGroupId);
    this.svgGroups.dateGroup = this.svgGroups.svg
      .append("g")
      .attr("id", this.dateGroupId);
    this.svgGroups.tooltipGroup = this.svgGroups.svg
      .append("g")
      .attr("id", this.tooltipGroupId)
      .attr("transform", "translate( 450, 600)");

  }

  createColorScaleRects() {
    var mods = this;

    var bins = 100;
    var binHeight = this.sizes.barHeight / bins;
    var offset = (this.sizes.height - this.sizes.barHeight) / 2; //1000 of the viewbox
    var a = (Math.min(...mods.colorScale.valuesArray) - Math.max(...mods.colorScale.valuesArray)) / this.sizes.barHeight;
    var b = Math.max(...mods.colorScale.valuesArray);
    var a2 = this.sizes.barHeight / (Math.min(...mods.colorScale.valuesArray) - Math.max(...mods.colorScale.valuesArray));
    var b2 = -Math.max(...mods.colorScale.valuesArray) * a2;

    this._elements.barsColorScale = this.svgGroups.colorScaleGroup.selectAll(".barsColorScale")
      .data(d3.range(bins), function (d) {
        return d;
      })
      .enter().append("rect")
      .attr("class", "barsColorScale")
      .attr("width", 20)
      .attr("height", binHeight)
      .attr("x", 0)
      .attr("y", function (d) {
        return binHeight * d + offset;
      })
      .attr("fill", function (d, i) {
        return mods.colorScale.scale(binHeight * a * d + b);
      })
  }

  updateColorScaleGradientStops() {
    var maxval = Math.max(...this.colorScale.valuesArray);
    var minval = Math.min(...this.colorScale.valuesArray);
    var pairs = [];
    for (var i = 0; i < Math.min(this.colorScale.valuesArray.length, this.colorScale.colorsArray.length); i++) {
      pairs.push({
        'offset': "" + percentage(this.colorScale.valuesArray[i], minval, maxval) + "%",
        'color': this.colorScale.colorsArray[i]
      });
    }
    console.log(pairs);
    var shit = this.colorScaleGradient
      .selectAll("stop")
      .data(pairs)
      .enter().append("stop")
      .attr("offset", function (d) {
        return d.offset;
      })
      .attr("stop-color", function (d) {
        return d.color;
      });
    console.log('shit', shit);
  }
  createColorScaleGradient() {
    this.colorScaleDefs = this.svgGroups.colorScaleGroup; //.append("defs")
    this.colorScaleGradient = this.colorScaleDefs
      .append("linearGradient")
      .attr("id", this.colorScale.linearGradientId)
      .attr("x1", "100%")
      .attr("y1", "100%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    //.attr("gradientTransform", "rotate(90)");

    this.updateColorScaleGradientStops(this);

    this.createColorScaleRect();

  }
  createColorScaleRect() {
    var offset = (this.sizes.height - this.sizes.barHeight) / 2;

    this._elements.barsColorScale = this.svgGroups.colorScaleGroup
      .append("rect")
      .attr("class", "barsColorScale")
      .attr("width", 20)
      .attr("height", this.sizes.barHeight)
      .attr("x", 0)
      .attr("y", offset)
      .attr("fill", "url(#" + this.colorScale.linearGradientId + ")")
  }
  createColorScaleTexts() {
    var offset = (this.sizes.height - this.sizes.barHeight) / 2; //1000 of the viewbox
    // var a = (Math.min(...this.colorScale.valuesArray) - Math.max(...this.colorScale.valuesArray)) / this.sizes.barHeight;
    //var b = Math.max(...this.colorScale.valuesArray);
    var a2 = this.sizes.barHeight / (Math.min(...this.colorScale.valuesArray) - Math.max(...this.colorScale.valuesArray));
    var b2 = -Math.max(...this.colorScale.valuesArray) * a2;
    this._elements.colorScaleText = this.svgGroups.colorScaleGroup.selectAll(".barsColorScaleText")
      .data(this.colorScale.valuesArray)
      .enter().append("text")
      .attr("text-anchor", "end")
      .attr("x", 90)
      .attr("y", function (d) {
        return a2 * d + b2 + offset + 20;
      })
      .text(function (d) {
        return d;
      })
      .attr("class", "barsColorScaleText");
  }

  createColorScale() {
    var mods = this;

    //this.createColorScaleRects();
    this.createColorScaleGradient();

    this.createColorScaleTexts();



  }
  changeColorScale(valuesArray, colorsArray) {
    this.colorScale.scale = d3.scaleLinear()
      .domain(valuesArray)
      .range(colorsArray);
    this.colorScale.valuesArray = valuesArray;
    this.colorScale.colorsArray = colorsArray;

    this.svgGroups.colorScaleGroup.selectAll(".barsColorScale").remove();
    this.svgGroups.colorScaleGroup.selectAll(".barsColorScaleText").remove();
    this.svgGroups.colorScaleGroup.selectAll("defs").remove();
    this.svgGroups.colorScaleGroup.selectAll("linearGradient").remove();
    this.createColorScale();

  }

  calcHexVertexAtPosition(i, j) {
    var dx = i * this.hexRadius * (1 + sin30);
    var dy = -j * this.hexRadius * cos30;

    var p = [];
    for (var i = 0; i < this.hexVertex.length; i++) {
      p.push([dx + this.hexVertex[i][0], dy + this.hexVertex[i][1]])
    }

    //console.log(p);
    return p;
  }


  createModules() {
    var modspromise = d3.json(this.urlConfigModules);
    var mods = this;
    var whatever = modspromise.then(function (jsondata) {
      //console.log("promise mods:", mods);
      for (var i = 0; i < jsondata.modules_location.length; i++) {
        mods.data.modules.push({
          "module_num": i,
          "value": 0,
          "x": jsondata.modules_location[i].x,
          "y": jsondata.modules_location[i].y
        });
        //console.log(mods.translateHex(jsondata.modules_location[i].x, jsondata.modules_location[i].y));
      }
      mods._elements.modsSvg = mods.svgGroups.modulesGroup
        .selectAll("path")
        .data(mods.data.modules)
        .enter()
        .append("path")
        .attr("class", "hexagon")
        .attr("d", function (d) {
          return mods.lineFromPoints(mods.calcHexVertexAtPosition(d.x, d.y));
        })
        .attr("id", function (d) {
          return "i" + d.x + "j" + d.y;
        })
        .attr("fill", "rgb(50,50,50)");

      mods.installMouseHandlers('modules');
    });

  }

  updateCB(jsondata, mods) {
    //this should be callback of d3.json whatever
    // expect an array of 265 values on jsondata.bp_temperatures
    //  console.log("updating");
    //  console.log(jsondata);
    var len = Math.min(jsondata.values.length, mods.data.modules.length)
    for (var i = 0; i < len; i++) {
      mods.data.modules[i].value = jsondata.values[i];
    }
    mods._elements.heatmap = mods.svgGroups.modulesGroup.selectAll(".hexagon")
      .data(mods.data.modules)
      .transition()
      .duration(1000)
      .attr("fill", function (d) {
        //console.log(mods.colorscale(d.bp_temperature));
        return mods.colorScale.scale(d.value);
      })
    mods.data.timestamp = jsondata.timestamp;
    var updateDt = moment.utc(jsondata.timestamp, 'X');
    //console.log(mods);
    mods.svgGroups.dateGroup.selectAll("text")
      .text('Updated on:' + updateDt.format('HH:mm:ss - DD/MM/YYYY'));

  }

  fakeValues(mods, rangeValues) {
    var t = {}
    t.timestamp = Math.floor((new Date()).getTime() / 1000);
    t.values = []
    var x = rangeValues[1] - rangeValues[0];
    var y = rangeValues[0];
    for (var i = 0; i < 265; i++) {
      t.values.push(Math.random() * x + y);
    }
    //console.log(rangeValues,x, y, t);
    mods.updateCB(t, mods);
  }

  installMouseHandlers(typeOfHandlers) {
    if (typeOfHandlers == 'modules') {
      this._elements.modsSvg
        .on("mouseover", this.getMouseOverModulesHandler(this))
        .on("mouseenter", this.getMouseEnterModulesHandler(this))
        .on("mouseleave", this.getMouseLeaveModulesHandler(this));
    }

  }

  getMouseOverModulesHandler(mods) {
    var f = function (d) {
      // use mods to access the instance of the class
      // use this to access the svg path item
      // use d    to access the data item of the module
      console.log(d);
    }

    return f;

  }
  getMouseEnterModulesHandler(mods) {
    var f = function (d) {
      // use mods to access the instance of the class
      // use this to access the svg path item
      // use d    to access the data item of the module
      var width = 160;
      var height = 100;
      var pos = d3.mouse(this);
      var x = 0;
      var y = 0;
      if (pos[0] < 0) {
        x = pos[0] + 10;
      } else {
        x = pos[0] - width - 10;
      }
      if (pos[1] < 0) {
        y = pos[1] + 10;
      } else {
        y = pos[1] - height - 10;
      }
      mods._elements.tooltipRect = mods.svgGroups.tooltipGroup.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("rx", 15)
        .attr("ry", 15)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", mods.colorScale.scale(d.value));
      mods._elements.tooltipRect2 = mods.svgGroups.tooltipGroup.append("rect")
        .attr("x", x + 5)
        .attr("y", y + 5)
        .attr("rx", 12)
        .attr("ry", 12)
        .attr("width", width - 10)
        .attr("height", height - 10)
        .attr("fill", "rgba(250,250,250,0.5)");
      mods._elements.tooltipValue = mods.svgGroups.tooltipGroup.append("text")
        .attr("x", x + width / 2)
        .attr("y", y + 55)
        .attr("width", width - 10)
        .attr("height", 60)
        .attr("text-anchor", "middle")
        .attr("class", "toolTipValue")
        .text(d.value.toFixed(2));
      mods._elements.tooltipPosition = mods.svgGroups.tooltipGroup.append("text")
        .attr("x", x + width / 2)
        .attr("y", y + height - 10)
        .attr("width", width - 10)
        .attr("height", 30)
        .attr("text-anchor", "middle")
        .attr("class", "toolTipPosition")
        .text("#{0} ({1}, {2})".format(d.module_num, d.x, d.y));
    }
    return f;

  }
  getMouseLeaveModulesHandler(mods) {
    var f = function (d) {
      // use mods to access the instance of the class
      // use this to access the svg path item
      // use d    to access the data item of the module
      mods._elements.tooltipRect.remove();
      mods._elements.tooltipRect2.remove();
      mods._elements.tooltipValue.remove();
      mods._elements.tooltipPosition.remove();
    }

    return f;

  }

}

///////////////////////////////////////////
// Demostrator
///////////////////////////////////////////


let m1 = new ModuleChart("BackPlanes Temperature", "bp_temp", "#container1", null);
var timer = setInterval(m1.fakeValues, 5000, m1, [-20, 60]);

let m2 = new ModuleChart("BackPlanes Humidity", "bp_hum2", "#container2", null);
m2.changeColorScale([0, 20, 75, 100], ['rgb(160,46,160)', 'rgb(31,193,79)', 'rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m2.fakeValues, 5000, m2, [0, 100]);

let m3 = new ModuleChart("Invented Metric", "bp_hum3", "#container3", null);
m3.changeColorScale([0, 10], ['rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m3.fakeValues, 3000, m3, [0, 10]);

let m4 = new ModuleChart("Invented Metric2", "bp_hum4", "#container4", null);
m4.changeColorScale([-10, 0, 10], ['rgb(160,46,160)', 'rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m4.fakeValues, 3000, m4, [-10, 10]);

let m5 = new ModuleChart("Invented Metric3", "bp_hum5", "#container5", null);
m5.changeColorScale([0, 10], ['rgb(31,193,79)', 'rgb(188, 1, 1)'])
setInterval(m5.fakeValues, 3000, m5, [0, 10]);

let m6 = new ModuleChart("Invented Metric4", "bp_hum6", "#container6", null);
m6.changeColorScale([0, 10], ['rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m6.fakeValues, 3000, m6, [0, 10]);

let m7 = new ModuleChart("Invented Metric5", "bp_hum7", "#container7", null);
m7.changeColorScale([0, 10], ['rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m7.fakeValues, 3000, m7, [0, 10]);

let m8 = new ModuleChart("Invented Metric6", "bp_hum8", "#container8", null);
m8.changeColorScale([-10, 20], ['rgb(94,132,105)', 'rgb(188, 1, 1)'])
setInterval(m8.fakeValues, 3000, m8, [-10, 20]);