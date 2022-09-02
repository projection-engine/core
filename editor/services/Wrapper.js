import GridSystem from "./GridSystem"
import IconsSystem from "./IconsSystem"
import GizmoSystem from "./GizmoSystem"
import SelectedSystem from "./SelectedSystem"
import BackgroundSystem from "./BackgroundSystem"
import RendererController from "../../production/controllers/RendererController";

export default class Wrapper {


    execute(isDuringFrameComposition, isDuringBinging) {
        const {
            selected,
            transformationType
        } = RendererController.params

        if (!isDuringFrameComposition && !isDuringBinging)
            SelectedSystem.drawToBuffer(selected)
        else if (!isDuringFrameComposition) {
            BackgroundSystem.execute()
            GridSystem.execute()
        } else if (isDuringFrameComposition) {
            gpu.enable(gpu.BLEND)
            gpu.blendFunc(gpu.SRC_ALPHA, gpu.ONE_MINUS_SRC_ALPHA)
            IconsSystem.execute()
            SelectedSystem.drawSilhouette(selected)
            GizmoSystem.execute(transformationType)
        }
    }
}