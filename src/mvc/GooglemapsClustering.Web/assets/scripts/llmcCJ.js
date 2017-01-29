// Author: C.J. Walls
// JQuery and Leaflet Maps library

//var marker = L.marker([51.5, -0.09]).addTo(map);

var llmcCJ;

(function ($) {
    llmcCJ = {

        markers: [], // markers on screen
        map: undefined,
        infowindow: undefined,
        debugMarker: undefined,
        debuginfo: undefined,

        debug: {
            showGridLines: false,
            showBoundaryMarker: false
        },

        log: function (s) {
            if (console && console.log) {
                console.log(s);
            }
        },

        round: function (num, decimals) {
            return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
        },

        zoomIn: function () {
            var z = llmcCJ.map.getZoom();
            llmcCJ.map.setZoom(z + 1);
        },

        zoomOut: function () {
            var z = llmcCJ.map.getZoom();
            llmcCJ.map.setZoom(z - 1);
        },

        mymap: {
            initialize: function () {
                llmcCJ.map = L.map('map').setView([llmcCJ.mymap.settings.mapCenterLat, llmcCJ.mymap.settings.mapCenterLon], llmcCJ.mymap.settings.zoomLevel);
                llmcCJ.map.options.minZoom = 3;
                llmcCJ.map.options.maxZoom = 19;

                // Add map tile layer
                L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(llmcCJ.map);

                llmcCJ.map.on('moveend', function (e) {
                    llmcCJ.mymap.events.getBounds();
                });

                // trigger first time event to draw points onmap on init
                llmcCJ.map.fire('moveend');
            },
            settings: {
                mapCenterLat: 35,
                mapCenterLon: 10,
                zoomLevel: 3,

                alwaysClusteringEnabledWhenZoomLevelLess: 2,

                jsonGetMarkersUrl: '/json/GetMarkers', // service endpoint url
                jsonGetMarkerInfoUrl: '/json/GetMarkerInfo',

                clusterImage: {
                    src: 'assets/images/clusters/cluster2.png', // this is invisible img only used for click-event detecting
                    height: 60,
                    width: 60,
                    offsetH: 30,
                    offsetW: 30
                },

                pinImage: {
                    src: 'assets/images/markers/pin24.png', //default unknown marker
                    height: 24,
                    width: 24,
                    offsetH: 0,
                    offsetW: 0
                },

                // specific markers
                pinImage1: {
                    src: 'assets/images/markers/court.png',
                    height: 37,
                    width: 32,
                    offsetH: 0,
                    offsetW: 0
                },
                pinImage2: {
                    src: 'assets/images/markers/firstaid.png',
                    height: 37,
                    width: 32,
                    offsetH: 0,
                    offsetW: 0
                },
                pinImage3: {
                    src: 'assets/images/markers/house.png',
                    height: 37,
                    width: 32,
                    offsetH: 0,
                    offsetW: 0
                }
            },

            events: {
                getBounds: function () {
                    var bounds = llmcCJ.map.getBounds()
                    , NE = bounds.getNorthEast()
                    , SW = bounds.getSouthWest()
                    , mapData = [];

                    // http://gis.stackexchange.com/questions/8650/how-to-measure-the-accuracy-of-latitude-and-longitude                    
                    mapData.neLat = llmcCJ.round(NE.lat, 7); // round to precision needed
                    mapData.neLon = llmcCJ.round(NE.lng, 7);
                    mapData.swLat = llmcCJ.round(SW.lat, 7);
                    mapData.swLon = llmcCJ.round(SW.lng, 7);
                    mapData.zoomLevel = llmcCJ.map.getZoom();

                    var _ = '_';
                    llmcCJ.mymap.events.loadMarkers(mapData);
                },

                polys: [], //cache drawn grid lines

                loadMarkers: function (mapData) {

                    var pinImg = L.icon({
                        iconUrl: llmcCJ.mymap.settings.pinImage.src,
                        iconSize: [llmcCJ.mymap.settings.pinImage.width, llmcCJ.mymap.settings.pinImage.height]
                    }),
                    pinImg1 = L.icon({
                        iconUrl: llmcCJ.mymap.settings.pinImage1.src,
                        iconSize: [llmcCJ.mymap.settings.pinImage1.width, llmcCJ.mymap.settings.pinImage1.height]
                    }),
                    pinImg2 = L.icon({
                        iconUrl: llmcCJ.mymap.settings.pinImage2.src,
                        iconSize: [llmcCJ.mymap.settings.pinImage2.width, llmcCJ.mymap.settings.pinImage2.height]
                    }),
                    pinImg3 = L.icon({
                        iconUrl: llmcCJ.mymap.settings.pinImage3.src,
                        iconSize: [llmcCJ.mymap.settings.pinImage3.width, llmcCJ.mymap.settings.pinImage3.height]
                    })

                    var params = {
                        nelat: mapData.neLat,
                        nelon: mapData.neLon,
                        swlat: mapData.swLat,
                        swlon: mapData.swLon,
                        zoomLevel: mapData.zoomLevel,
                        w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
                        h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
                    };

                    $.ajax({
                        type: 'GET',
                        url: llmcCJ.mymap.settings.jsonGetMarkersUrl,
                        data: params,
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: function (data) {

                            if (data.Ok === '0') {
                                llmcCJ.log(data.Emsg);
                                return; // invalid state has occured
                            }

                            var markersDrawTodo = llmcCJ.mymap.dynamicUpdateMarkers(data.Markers, llmcCJ.markers, llmcCJ.mymap.getKey, true);

                            $.each(markersDrawTodo, function () {
                                var item = this;
                                var lat = item.Y; // lat
                                var lon = item.X; // lon

                                var latLng = L.latLng(lat, lon);

                                //identify type and select icon
                                var iconImg;
                                if (item.C === 1) {
                                    if (item.T === 1) iconImg = pinImg1;
                                    else if (item.T === 2) iconImg = pinImg2;
                                    else if (item.T === 3) iconImg = pinImg3;
                                    else iconImg = pinImg; // fallback                                
                                } else {
                                    iconImg = pinImg; // fallback
                                }

                                // this draws a new marker on map
                                var marker = L.marker(latLng).addTo(llmcCJ.map);
                                var key = llmcCJ.mymap.getKey(item);
                                marker['key'] = key; // ref used for next event, remove or keep the marker

                                if (item.C == 1) { // single item, no cluster
                                    marker.on('click', function (e) {
                                        llmcCJ.mymap.events.popupWindow(marker, item);
                                    });

                                    marker.setIcon(iconImg);
                                }
                                else { // cluster marker
                                    marker.on('click', function (e) {
                                        var z = llmcCJ.map.getZoom();
                                        var n;
                                        //zoom in steps are dependent on current zoom level
                                        if (z <= 8) { n = 3; }
                                        else if (z <= 12) { n = 2; }
                                        else { n = 1; }

                                        llmcCJ.map.setView(latLng, z + n);
                                    });

                                    var clusterHtml = '<div class="' + llmcCJ.mymap.getCluserIcon(item.C) + '">' + item.C + '</div>'
                                    var clusterIcon = L.divIcon({html: clusterHtml });
                                    marker.setIcon(clusterIcon);
                                }

                                llmcCJ.markers.push(marker);



                            });

                            // clear array
                            markersDrawTodo.length = 0;
                        },
                        error: function (xhr, err) {
                            var msg = 'readyState: ' + xhr.readyState + '\nstatus: ' + xhr.status
                                + '\nresponseText: ' + xhr.responseText;

                            llmcCJ.log(msg);
                        }
                    })

                },

                popupWindow: function (marker, item) {

                    $.ajax({
                        type: 'GET',
                        url: llmcCJ.mymap.settings.jsonGetMarkerInfoUrl,
                        data: { id: item.I },
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: function (data) {

                            if (data.Ok === '0') {
                                llmcCJ.log(data.EMsg);
                                return; // invalid state has occured
                            }
                            marker.bindPopup(data.Content).openPopup();
                        },
                        error: function (xhr, err) {
                            var msg = 'readyState: ' + xhr.readyState + '\nstatus: ' + xhr.status + '\nresponseText: '
                                + xhr.responseText + '\nerr:' + err;

                            llmcCJ.log(msg);
                            marker.bindPopup("Marker has no detail information.").openPopup();
                        }
                    });
                }
            },

            getCluserIcon: function (count) {
                if (count >= 10000) return 'gmcKN_clustersize5';
                else if (count >= 1000) return 'gmcKN_clustersize4';
                else if (count >= 100) return 'gmcKN_clustersize3';
                else if (count >= 10) return 'gmcKN_clustersize2';
                else return 'gmcKN_clustersize1';
            },

            // lon, lat, count, type
            getKey: function (p) {
                var s = p.X + '__' + p.Y + '__' + p.C + '__' + p.T;
                return s.replace(/\./g, '_'); //replace . with _
            },

            // binary sum for toggle values
            toggleVal: function (arr) {
                return arr.reduce(function (p, c, i, a) {
                    return p + (c * Math.pow(2, i));
                }, 0);
            },

            // set count labels, style and class for the clusters
            Label: function (optOptions, id, count) {
                this.setValues(optOptions);
                var span = this.span_ = document.createElement('span');

                if (count >= 10000) span.className = 'gmcKN_clustersize5';
                else if (count >= 1000) span.className = 'gmcKN_clustersize4';
                else if (count >= 100) span.className = 'gmcKN_clustersize3';
                else if (count >= 10) span.className = 'gmcKN_clustersize2';
                else span.className = 'gmcKN_clustersize1';

                var div = this.div_ = document.createElement('div');
                div.appendChild(span);
                div.className = 'countinfo_' + id;
                div.style.cssText = 'position: absolute; display: none;';
            },

            // Only update new markers not currently drawn and remove obsolete markers on screen
            dynamicUpdateMarkers: function (markers, cache, keyfunction, isclusterbased) {
                var markersCacheIncome = [] // points to be drawn, new points received
                , markersCacheOnMap = []  // current drawn points
                , p
                , key;

                // points to be displayed, diff of markersCacheIncome and markersCacheOnMap
                var markersDrawTodo = [];

                // store new points to be drawn                  
                for (i in markers) {
                    if (markers.hasOwnProperty(i)) {
                        p = markers[i];
                        key = keyfunction(p); //key                            
                        markersCacheIncome[key] = p;
                    }
                }
                // store current existing valid markers
                for (i in cache) {
                    if (cache.hasOwnProperty(i)) {
                        m = cache[i];
                        key = m.key; // key  
                        if (key !== 0) { // 0 is used as has been deleted
                            markersCacheOnMap[key] = 1;
                        }

                        if (key === undefined) {
                            gmcKN.log('error in code: key'); // catch error in code
                        }
                    }
                }

                // add new markers from event not already drawn
                for (var i in markers) {
                    if (markers.hasOwnProperty(i)) {
                        p = markers[i];
                        key = keyfunction(p); //key                            
                        if (markersCacheOnMap[key] === undefined) {
                            if (markersCacheIncome[key] === undefined) {
                                gmcKN.log('error in code: key2'); //catch error in code
                            }
                            var newmarker = markersCacheIncome[key];
                            markersDrawTodo.push(newmarker);
                        }
                    }
                }

                // remove current markers which should not be displayed
                for (i in cache) {
                    if (cache.hasOwnProperty(i)) {
                        var m = cache[i];
                        key = m.key; //key                            
                        if (key !== 0 && markersCacheIncome[key] === undefined) {
                            if (isclusterbased === true) {
                                $('.countinfo_' + key).remove();
                            }
                            cache[i].key = 0; // mark as deleted
                            llmcCJ.map.removeLayer(cache[i]); // this removes the marker from the map
                        }
                    }
                }

                // trim markers array size
                var temp = [];
                for (i in cache) {
                    if (cache.hasOwnProperty(i)) {
                        key = cache[i].key; //key                            
                        if (key !== 0) {
                            tempItem = cache[i];
                            temp.push(tempItem);
                        }
                    }
                }

                cache.length = 0;
                for (i in temp) {
                    if (temp.hasOwnProperty(i)) {
                        var tempItem = temp[i];
                        cache.push(tempItem);
                    }
                }

                // clear array
                markersCacheIncome.length = 0;
                markersCacheOnMap.length = 0;
                temp.length = 0;

                return markersDrawTodo;
            }
        }
    };
})(jQuery);