function stackplot(path) {

    var margin = { top: 20, right: 231, bottom: 140, left: 40 },
        width = 1200 - margin.left - margin.right,
        height = 900 - margin.top - margin.bottom;

    var xscale = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var yscale = d3.scale.linear()
        .rangeRound([height, 0]);

    var colors = d3.scale.ordinal()
        .range(['#94003a', '#784212', '#C59D79', '#856CC1', '#F0E578', '#95C26A ', '#CFEDB2', '#ED9A41', '#F0B678', '#b2b7ed', '#6977d9', '#17439b']);

    var xaxis = d3.svg.axis()
        .scale(xscale)
        .orient("bottom");

    var yaxis = d3.svg.axis()
        .scale(yscale)
        .orient("left")
        .tickFormat(d3.format(".0%")); // **

    try {
        var elem = document.getElementById("tempo");
        elem.parentElement.removeChild(elem);
    } catch (error) {};





    var svg = d3.select("#stackplot").append("svg").attr("id", "tempo")
        .attr("width", width + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    ;

    // load and handle the data
    d3.tsv(path, function(error, data) {

        // rotate the data
        var categories = d3.keys(data[0]).filter(function(key) { return key !== "groupe_phonemique"; });
        var parsedata = categories.map(function(name) { return { "groupe_phonemique": name }; });
        data.forEach(function(d) {
            parsedata.forEach(function(pd) {
                pd[d["groupe_phonemique"]] = d[pd["groupe_phonemique"]];
            });
        });

        // map column headers to colors
        colors.domain(d3.keys(parsedata[0]).filter(function(key) { return key !== "groupe_phonemique"; }));

        // add a 'responses' parameter to each row that has the height percentage values for each rect
        parsedata.forEach(function(pd) {
            var y0 = 0;
            // colors.domain() is an array of the column headers (text)
            // pd.responses will be an array of objects with the column header
            // and the range of values it represents
            pd.responses = colors.domain().map(function(response) {
                var responseobj = { response: response, y0: y0, yp0: y0 };
                y0 += +pd[response];
                responseobj.y1 = y0;
                responseobj.yp1 = y0;
                return responseobj;
            });
            // y0 is now the sum of all the values in the row for this category
            // convert the range values to percentages
            pd.responses.forEach(function(d) {
                d.yp0 /= y0;
                d.yp1 /= y0;
            });
            // save the total
            pd.totalresponses = pd.responses[pd.responses.length - 1].y1;
        });

        // sort by the value in 'Right Direction'
        // parsedata.sort(function(a, b) { return b.responses[0].yp1 - a.responses[0].yp1; });

        // ordinal-ly map categories to x positions
        xscale.domain(parsedata.map(function(d) { return d.groupe_phonemique }));

        // add the x axis and rotate its labels
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xaxis)
            .selectAll("text")
            .attr("y", 5)
            .attr("x", 7)
            .attr("dy", ".35em")
            .attr("transform", "rotate(65)")
            .style("text-anchor", "start");

        // add the y axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yaxis);

        // create svg groups ("g") and place them
        var category = svg.selectAll(".category")
            .data(parsedata)
            .enter().append("g")
            .attr("class", "category")
            .attr("transform", function(d) { return "translate(" + xscale(d.groupe_phonemique) + ",0)"; });

        // draw the rects within the groups
        category.selectAll("rect")
            .data(function(d) { return d.responses; })
            .enter().append("rect")
            .attr("width", xscale.rangeBand())
            .attr("y", function(d) { return yscale(d.yp1); })
            .attr("height", function(d) { return yscale(d.yp0) - yscale(d.yp1); })
            .style("fill", function(d) { return colors(d.response); });

        // position the legend elements
        var legend = svg.selectAll(".legend")
            .data(colors.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(20," + ((height - 18) - (i * 20)) + ")"; });

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colors);

        legend.append("text")
            .attr("x", width + 10)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(function(d) { return d; });

        // animation
        d3.selectAll("input").on("change", handleFormClick);

        function handleFormClick() {
            if (this.value === "bypercent") {
                transitionPercent();
            } else {
                transitionCount();
            }
        }

        // transition to 'percent' presentation
        function transitionPercent() {
            // reset the yscale domain to default
            yscale.domain([0, 1]);

            // create the transition
            var trans = svg.transition().duration(250);

            // transition the bars
            var categories = trans.selectAll(".category");
            categories.selectAll("rect")
                .attr("y", function(d) { return yscale(d.yp1); })
                .attr("height", function(d) { return yscale(d.yp0) - yscale(d.yp1); });

            // change the y-axis
            // set the y axis tick format
            yaxis.tickFormat(d3.format(".0%"));
            svg.selectAll(".y.axis").call(yaxis);
        }

        // transition to 'count' presentation
        function transitionCount() {
            // set the yscale domain
            yscale.domain([0, d3.max(parsedata, function(d) { return d.totalresponses; })]);

            // create the transition
            var transone = svg.transition()
                .duration(250);

            // transition the bars (step one)
            var categoriesone = transone.selectAll(".category");
            categoriesone.selectAll("rect")
                .attr("y", function(d) { return this.getBBox().y + this.getBBox().height - (yscale(d.y0) - yscale(d.y1)) })
                .attr("height", function(d) { return yscale(d.y0) - yscale(d.y1); });

            // transition the bars (step two)
            var transtwo = transone.transition()
                .delay(350)
                .duration(350)
                .ease("bounce");
            var categoriestwo = transtwo.selectAll(".category");
            categoriestwo.selectAll("rect")
                .attr("y", function(d) { return yscale(d.y1); });

            // change the y-axis
            // set the y axis tick format
            yaxis.tickFormat(d3.format(".2s"));
            svg.selectAll(".y.axis").call(yaxis);
        }
    });

    d3.select(self.frameElement).style("height", (height + margin.top + margin.bottom) + "px");

}