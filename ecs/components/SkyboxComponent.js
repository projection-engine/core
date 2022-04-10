import {createTexture, lookAt} from "../../utils/misc/utils";
import Component from "../basic/Component";
import CubeMapInstance from "../../instances/CubeMapInstance";
import Shader from "../../utils/workers/Shader";

import * as skyboxCode from "../../shaders/misc/skybox.glsl";

export default class SkyboxComponent extends Component {
    __cubeMap
    __initialized = false
    _resolution = 512
    _gamma = 1
    _exposure = 1
    imageID = undefined
    _prefilteredMipmaps = 6

    constructor(id) {
        super(id, 'SkyboxComponent');

    }
    get blob (){
        return this.__blob
    }
    set blob(data){
        this.__blob = data
        if(data)
            this.__initialized = false
    }


    get resolution() {
        return this._resolution
    }

    set resolution(data) {
        this._resolution = data
        this.ready = false
    }
    set ready(data) {
         this.__initialized = data
    }

    set gamma (data){
      this._gamma = data
    }
    set exposure (data){
        this._exposure = data
    }
    set prefilteredMipmaps(data){
        this._prefilteredMipmaps = data
    }

    set cubeMap(data){
        this.__cubeMap = data
    }

    get cubeMap(){
        return this.__cubeMap
    }
    get gamma (){
        return this._gamma
    }
    get exposure (){
        return this._exposure
    }
    get prefilteredMipmaps(){
        return this._prefilteredMipmaps
    }
    get ready() {
        return this.__initialized
    }

}