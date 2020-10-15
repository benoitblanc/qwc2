/**
* Copyright 2015, GeoSolutions Sas.
* All rights reserved.
*
* This source code is licensed under the BSD-style license found in the
* LICENSE file in the root directory of this source tree.
*/

const ol = require('openlayers');
const popUp = require('./OlPopUp')();
const assign = require('object-assign');
const locationIcon = require('../../icons/location-heading.svg');

class OlLocate extends ol.Object {
    constructor(map, optOptions) {
        super();
        this.set("state", "DISABLED");
        this.map = map;
        let defOptions = {
            drawCircle: true,// draw accuracy circle
            follow: true,// follow with zoom and pan the user's location
            stopFollowingOnDrag: false, // if follow is true, stop following when map is dragged (deprecated)
            // if true locate control remains active on click even if the user's location is in view.
            // clicking control will just pan to location not implemented
            remainActive: true,
            locateStyle: this._getDefaultStyles(),
            metric: true,
            onLocationError: this.onLocationError,
            // keep the current map zoom level when displaying the user's location. (if 'false', use maxZoom)
            keepCurrentZoomLevel: false,
            showPopup: false, // display a popup when the user click on the inner marker
            strings: {
                metersUnit: "meters",
                feetUnit: "feet",
                popup: "You are within {distance} {unit} from this point"
            },
            locateOptions: {
                maximumAge: 2000,
                enableHighAccuracy: true,
                timeout: 10000,
                maxZoom: 18
            }
        };

        this.options = assign({}, defOptions, optOptions || {} );
        this.geolocate = new ol.Geolocation({
            projection: this.map.getView().getProjection(),
            trackingOptions: this.options.locateOptions
        });
        this.geolocate.on('change:position', this._updatePosFt, this);
        this.geolocate.on('change:heading', this._updateHeading, this);
        this.popup = popUp;
        this.popup.hidden = true;
        this.popCnt = popUp.getElementsByClassName("ol-popup-cnt")[0];
        this.overlay = new ol.Overlay({
            element: this.popup,
            positioning: 'top-center',
            stopEvent: false
        });
        this.layer = new ol.layer.Vector({
            source: new ol.source.Vector({ useSpatialIndex: false })
        });
        this.posFt = new ol.Feature({
            geometry: this.geolocate.getAccuracyGeometry(),
            name: 'position',
            id: '_locate-pos'
        });
        this.posFt.setStyle(this.options.locateStyle);
        this.layer.getSource().addFeature(this.posFt);
    }
    start = () => {
        this.geolocate.on('error', this.options.onLocationError, this);
        this.follow = this.options.follow;
        this.geolocate.setTracking(true);
        this.layer.setMap(this.map);
        this.map.addOverlay(this.overlay);
        if (this.options.showPopup) {
            this.map.on('click', this.mapClick, this);
            this.map.on('touch', this.mapClick, this);
        }
        if (this.options.stopFollowingOnDrag) {
            this.map.on('pointerdrag', this.stopFollow, this);
        }
        if (!this.p) {
            this.set("state", "LOCATING");
        } else {
            this._updatePosFt();
        }
    }
    stop = () => {
        this.geolocate.un('error', this.options.onLocationError, this);
        this.geolocate.setTracking(false);
        this.popup.hide = true;
        this.map.removeOverlay(this.overlay);
        this.layer.setMap( null );
        if (this.options.showPopup) {
            this.map.un('click', this.mapClick);
            this.map.un('touch', this.mapClick);
        }
        if (this.options.stopFollowingOnDrag && this.follow) {
            this.map.un('pointerdrag', this.stopFollow, this);
        }
        this.set("state", "DISABLED");
    }
    startFollow = () => {
        this.follow = true;
        if (this.options.stopFollowingOnDrag) {
            this.map.on('pointerdrag', this.stopFollow, this);
        }
        if (this.p) {
            this._updatePosFt();
        }
    }
    stopFollow = () => {
        this.follow = false;
        this.map.un('pointerdrag', this.stopFollow, this);
        this.set("state", "ENABLED");
    }
    updateView = (point) => {
        if (this.follow) {
            this.map.getView().setCenter(point.getCoordinates());
            if (!this.options.keepCurrentZoomLevel) {
                this.map.getView().setZoom(this.options.locateOptions.maxZoom);
            }
        }
    }
    onLocationError = (err) => {
        alert(err.message);
    }
    mapClick = (evt) => {
        let feature = this.map.forEachFeatureAtPixel(evt.pixel, (ft) => ft);
        if (feature && feature.get('id') === '_locate-pos' && this.popup.hidden) {
            this._updatePopUpCnt();
        } else if (!this.popup.hidden ) {
            popUp.hidden = true;
        }
    }

    setStrings = (newStrings) => {
        this.options.strings = assign({}, this.options.strings, newStrings);
    }
    setProjection = (projection) => {
        this.geolocate.setProjection(projection);
    }
    _updatePosFt = () => {
        let state = this.get("state");
        let nState = (this.follow) ? "FOLLOWING" : "ENABLED";
        if (nState !== state) {
            this.set("state", nState);
        }
        let p = this.geolocate.getPosition();
        this.p = p;
        let point = new ol.geom.Point(p);
        if (this.options.drawCircle) {
            let accuracy = new ol.geom.Circle(point.getCoordinates(), this.geolocate.getAccuracy());
            this.posFt.setGeometry(new ol.geom.GeometryCollection([point, accuracy]));
        } else {
            this.posFt.setGeometry(new ol.geom.GeometryCollection([point]));
        }
        if (!this.popup.hidden) {
            this._updatePopUpCnt();
        }
        if (this.follow) {
            this.updateView(point);
        }
        // Update only once
        if (!this.options.remainActive) {
            this.geolocate.setTracking(false);
        }
    }
    _updatePopUpCnt = () => {
        let distance;
        let unit;
        if (this.options.metric) {
            distance = this.geolocate.getAccuracy();
            unit = this.options.strings.metersUnit;
        } else {
            distance = Math.round(this.geolocate.getAccuracy() * 3.2808399);
            unit = this.options.strings.feetUnit;
        }
        let cnt = this.options.strings.popup.replace("{distance}", distance);
        this.popCnt.innerHTML = cnt.replace("{unit}", unit);
        this.overlay.setPosition(this.posFt.getGeometry().getGeometries()[0].getCoordinates());
        this.popup.hidden = false;
    }
    _updateHeading = () => {
        let h = this.geolocate.getHeading() || 0;
        this.posFt.getStyle().getImage().setRotation(180 / Math.PI * h);
    }
    _getDefaultStyles = () => {
        return new ol.style.Style({
            image: new ol.style.Icon({
                src: locationIcon,
                imgSize: [27, 55],
                rotateWithView: true
            }),
            fill: new ol.style.Fill({color: 'rgba(19,106,236,0.15)'}),
            stroke: new ol.style.Stroke({color: 'rgba(19,106,236,1)', width: 2})
        });
    }
};

module.exports = OlLocate;
