import {useEffect, useState} from "react";
import ShadowMapShader from "./renderer/lights/shaders/light/ShadowMapShader";
import SkyBoxShader from "./renderer/lights/shaders/skybox/SkyBoxShader";
import MeshShader from "./renderer/mesh/shaders/MeshShader";
import OutlineShader from "./renderer/mesh/shaders/OutlineShader";
import GridShader from "./renderer/utils/shaders/GridShader";
import PostProcessing from "./renderer/postprocessing/entities/PostProcessing";

import useObjects from "./useObjects";

import Grid from "./renderer/utils/entities/Grid";
import {enableBasics} from "./utils/utils";
import Renderer from "./renderer/Renderer";
import LightShader from "./renderer/lights/shaders/light/LightShader";
import PostProcessingShader from "./renderer/postprocessing/shaders/postprocessing/PostProcessingShader";
import DeferredShader from "./renderer/postprocessing/shaders/deferred/DeferredShader";

export default function useEngine(id, cameraType) {

    const [shaders, setShaders] = useState({})
    const [keepExecution, setKeepExecution] = useState(true)
    const [gpu, setGpu] = useState()
    const [selectedElement, setSelectedElement] = useState(null)

    // BUFFERS


    const [grid, setGrid] = useState({})

    let mainRenderer
    const {
        hierarchy, dispatchHierarchy,
        skybox, setSkybox,
        lights, setLights,
        meshes, setMeshes,
        instances, ready,
        setInstances, materials, setMaterials
    } = useObjects(gpu)


    useEffect(() => {
        const newGPU = document.getElementById(id + '-canvas').getContext('webgl2', {antialias: false})

        setShaders({
            deferredShader: new DeferredShader(newGPU),
            shadowMap: new ShadowMapShader(newGPU),
            skybox: new SkyBoxShader(newGPU),
            mesh: new MeshShader(newGPU),
            outline: new OutlineShader(newGPU),
            grid: new GridShader(newGPU),
            postProcessing: new PostProcessingShader(newGPU),
            lightShader: new LightShader(newGPU)
        })

        setGrid(new Grid(newGPU))
        enableBasics(newGPU)
        setGpu(newGPU)

    }, [])


    useEffect(() => {
        if (!mainRenderer && gpu !== undefined)
            mainRenderer = new Renderer(id, cameraType, gpu)
        if (ready && gpu && mainRenderer && keepExecution)
            mainRenderer?.start({
                meshes,
                gpu, materials,
                skybox,
                selectedElement,
                shaders, grid,
                instances,
                lights
            })
        return () => {
            if (mainRenderer !== undefined)
                mainRenderer?.stop()
        }
    }, [
        mainRenderer,
        instances,
        gpu,
        lights,
        keepExecution,
        ready
    ])

    return {
        ready,
        meshes, setMeshes,
        lights,
        setLights,
        gpu, materials, setMaterials,
        keepExecution, setKeepExecution,
        skybox, setSkybox,
        selectedElement, setSelectedElement,
        hierarchy, dispatchHierarchy,
        setInstances, instances
    }
}