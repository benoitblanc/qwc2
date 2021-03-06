/**
* Copyright 2019, Sourcepole AG.
* All rights reserved.
*
* This source code is licensed under the BSD-style license found in the
* LICENSE file in the root directory of this source tree.
*/

const React = require('react');
const PropTypes = require('prop-types');
const uuid = require('uuid');
const {LayerRole} = require('../../actions/layers');
const Icon = require('../../components/Icon');
const LocaleUtils = require('../../utils/LocaleUtils');

require('./style/VectorLayerPicker.css');


class VectorLayerPicker extends React.Component {
    static propTypes = {
        value: PropTypes.string,
        layers: PropTypes.array,
        onChange: PropTypes.func,
        addLayer: PropTypes.func
    }
    static contextTypes = {
        messages: PropTypes.object
    }
    render() {
        return (
            <div className="VectorLayerPicker">
                <select className="combo" value={this.props.value} onChange={ev => this.props.onChange(this.props.layers.find(layer => layer.id === ev.target.value))}>
                    {this.props.layers.map(layer => (<option key={layer.id} value={layer.id}>{layer.title}</option>))}
                </select>
                <button className="button" onClick={this.addLayer} style={{borderLeftWidth: 0}}><Icon icon="plus" /></button>
            </div>
        );
    }
    addLayer = () => {
        let message = LocaleUtils.getMessageById(this.context.messages, "vectorlayerpicker.prompt");
        let name = prompt(message);
        if(name) {
            let layer = {
                title: name,
                type: 'vector'
            };
            this.props.addLayer(layer);
            this.props.onChange(layer);
        }
    }
};

module.exports = VectorLayerPicker;
