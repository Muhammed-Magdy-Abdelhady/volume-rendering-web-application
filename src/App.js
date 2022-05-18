import { useState } from 'react';
import { vec3, quat, mat4 } from 'gl-matrix';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageCroppingWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkImageMarchingCubes from '@kitware//vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPiecewiseGaussianWidget from '@kitware/vtk.js/Interaction/Widgets/PiecewiseGaussianWidget';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';


function App() {
    // const [ opacity, setOpacity] = useState(3);
    // const [ skinOpacity, setSkinOpacity] = useState(0);
    // const [ bonesOpacity, setBonesOpacity] = useState(0.8);
    // const [ urlIndex, setUrlIndex] = useState(0);
    const [ renderingMode, setRenderingMode] = useState(0);

    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        background: [0, 0, 0],
    });

    const URLs = [
        `https://kitware.github.io/vtk-js/data/volume/headsq.vti`,
        `https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`
    ]

    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();
    const apiRenderWindow = fullScreenRenderer.getApiSpecificRenderWindow();
    
    global.renderer = renderer;
    global.renderWindow = renderWindow;

    // ----------------------------------------------------------------------------
    // 2D overlay rendering
    // ----------------------------------------------------------------------------

    const overlaySize = 15;
    const overlayBorder = 2;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.width = `${overlaySize}px`;
    overlay.style.height = `${overlaySize}px`;
    overlay.style.border = `solid ${overlayBorder}px red`;
    overlay.style.borderRadius = '50%';
    overlay.style.left = '-100px';
    overlay.style.pointerEvents = 'none';
    document.querySelector('body').appendChild(overlay);

    // ----------------------------------------------------------------------------
    // Widget manager
    // ----------------------------------------------------------------------------

    const widgetManager = vtkWidgetManager.newInstance();
    

    const widget = vtkImageCroppingWidget.newInstance();

    function widgetRegistration(e) {
        const action = e ? e.currentTarget.dataset.action : 'addWidget';
        const viewWidget = widgetManager[action](widget);
        if (viewWidget) {

            viewWidget.setDisplayCallback((coords) => {
                
                overlay.style.left = '-100px';
                
                if (coords) {
                    const [w, h] = apiRenderWindow.getSize();
                    overlay.style.left = `${Math.round(
                    (coords[0][0] / w) * window.innerWidth -
                        overlaySize * 0.5 -
                        overlayBorder
                    )}px`;
                    overlay.style.top = `${Math.round(
                    ((h - coords[0][1]) / h) * window.innerHeight -
                        overlaySize * 0.5 -
                        overlayBorder
                    )}px`;
                }

            });

            renderer.resetCamera();
            renderer.resetCameraClippingRange();
        }
        widgetManager.enablePicking();
        renderWindow.render();
    }

    // Initial widget register

    // ----------------------------------------------------------------------------
    // Volume rendering
    // ----------------------------------------------------------------------------

    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    // const chestReader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

    const marchingCube = vtkImageMarchingCubes.newInstance({
        contourValue: 0.0,
        computeNormals: true,
        mergePoints: true,
    });
    const ofunwid = vtkPiecewiseGaussianWidget.newInstance({
      numberOfBins: 256,
      size: [400, 150],
    });
    const ctfun = vtkColorTransferFunction.newInstance();
    const ofun = vtkPiecewiseFunction.newInstance();

    const widgetContainer = document.createElement('div');
    widgetContainer.setAttribute("id","deleteable");
    widgetContainer.style.zIndex = "2";
    widgetContainer.style.width = "400px";
    widgetContainer.style.height = "150px";
    widgetContainer.style.position = 'absolute';
    widgetContainer.style.top = 'calc(200px + 1em)';
    widgetContainer.style.left = '5px';
    widgetContainer.style.background = 'rgba(255, 255, 255, 0.3)';
  
    
  
    ofunwid.setContainer(widgetContainer);

    const actor = [vtkActor.newInstance(),vtkVolume.newInstance()];
    const mapper = [vtkMapper.newInstance(),vtkVolumeMapper.newInstance()];

    if (renderingMode === 1){
        widgetManager.setRenderer(renderer);
        widgetRegistration();
        mapper[renderingMode].setSampleDistance(1.1);
        actor[renderingMode].setMapper(mapper[renderingMode]);

        // create color and opacity transfer functions
        
        ctfun.addRGBPoint(0, 85 / 255.0, 0, 0);
        ctfun.addRGBPoint(95, 1.0, 1.0, 1.0);
        // ctfun.addRGBPoint(225, 0.66, 0.66, 0.5);
        // ctfun.addRGBPoint(255, 0.3, 1.0, 0.5);
        ctfun.addRGBPoint(850, 0.9, 0.74, 0.67);
        ctfun.addRGBPoint(2000, 1.0, 1.0, 1.0);
        

        
        ofunwid.updateStyle({
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          histogramColor: 'rgba(100, 100, 100, 0.5)',
          strokeColor: 'rgb(0, 0, 0)',
          activeColor: 'rgb(255, 255, 255)',
          handleColor: 'rgb(50, 150, 50)',
          buttonDisableFillColor: 'rgba(255, 255, 255, 0.5)',
          buttonDisableStrokeColor: 'rgba(0, 0, 0, 0.5)',
          buttonStrokeColor: 'rgba(0, 0, 0, 1)',
          buttonFillColor: 'rgba(255, 255, 255, 1)',
          strokeWidth: 2,
          activeStrokeWidth: 3,
          buttonStrokeWidth: 1.5,
          handleWidth: 3,
          iconSize: 20, // Can be 0 if you want to remove buttons (dblClick for (+) / rightClick for (-))
          padding: 10,
        });

        // if (urlIndex === 0){
        //     ofun.addPoint(200.0, 0.0);
        //     ofun.addPoint(850.0, skinOpacity); // head skin
        //     ofun.addPoint(2000.0, bonesOpacity); // head bones
        //     ofun.addPoint(6000.0, 0.0);
        // } else {
        //     ofun.addPoint(0.0, 0.0);
        //     ofun.addPoint(255.0, bonesOpacity);
        // }

        actor[renderingMode].getProperty().setRGBTransferFunction(0, ctfun);
        actor[renderingMode].getProperty().setScalarOpacity(0, ofun);
        actor[renderingMode].getProperty().setScalarOpacityUnitDistance(0, 3.0);
        actor[renderingMode].getProperty().setInterpolationTypeToLinear();
        actor[renderingMode].getProperty().setUseGradientOpacity(0, true);
        actor[renderingMode].getProperty().setGradientOpacityMinimumValue(0, 2);
        actor[renderingMode].getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
        actor[renderingMode].getProperty().setGradientOpacityMaximumValue(0, 20);
        actor[renderingMode].getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
        actor[renderingMode].getProperty().setShade(true);
        actor[renderingMode].getProperty().setAmbient(0.2);
        actor[renderingMode].getProperty().setDiffuse(0.7);
        actor[renderingMode].getProperty().setSpecular(0.3);
        actor[renderingMode].getProperty().setSpecularPower(8.0);
        mapper[renderingMode].setInputConnection(reader.getOutputPort());
        
    } else {

        actor[renderingMode].setMapper(mapper[renderingMode])
        mapper[renderingMode].setInputConnection(marchingCube.getOutputPort())
        marchingCube.setInputConnection(reader.getOutputPort())
    }

    // -----------------------------------------------------------
    // Get data
    // -----------------------------------------------------------

    function getCroppingPlanes(imageData, ijkPlanes) {
        
        const rotation = quat.create();
        mat4.getRotation(rotation, imageData.getIndexToWorld());

        const rotateVec = (vec) => {
            const out = [0, 0, 0];
            vec3.transformQuat(out, vec, rotation);
            return out;
        };

        const [iMin, iMax, jMin, jMax, kMin, kMax] = ijkPlanes;
        const origin = imageData.indexToWorld([iMin, jMin, kMin]);
        // opposite corner from origin
        const corner = imageData.indexToWorld([iMax, jMax, kMax]);

        return [
            // X min/max
            vtkPlane.newInstance({ normal: rotateVec([1, 0, 0]), origin }),
            vtkPlane.newInstance({ normal: rotateVec([-1, 0, 0]), origin: corner }),
            // Y min/max
            vtkPlane.newInstance({ normal: rotateVec([0, 1, 0]), origin }),
            vtkPlane.newInstance({ normal: rotateVec([0, -1, 0]), origin: corner }),
            // X min/max
            vtkPlane.newInstance({ normal: rotateVec([0, 0, 1]), origin }),
            vtkPlane.newInstance({ normal: rotateVec([0, 0, -1]), origin: corner }),
        ];
    }

    let globalDataRange;

    reader.setUrl(URLs[0]).then(() => {
    reader.loadData().then(() => {
        const image = reader.getOutputData();

        // update crop widget
        widget.copyImageDataDescription(image);
        const cropState = widget.getWidgetState().getCroppingPlanes();
        cropState.onModified(() => {
        const planes = getCroppingPlanes(image, cropState.getPlanes());
        mapper[renderingMode].removeAllClippingPlanes();
        planes.forEach((plane) => {
            mapper[renderingMode].addClippingPlane(plane);
        });
        mapper[renderingMode].modified();
        });

        if (renderingMode === 0){
            globalDataRange = image.getPointData().getScalars().getRange();
            const firstIsoValue = (globalDataRange[0] + globalDataRange[1]) / 3;
            marchingCube.setContourValue(firstIsoValue);
        }
        console.log(actor)
        // add volume to renderer
        if (renderingMode === 1){
          const dataArray = image.getPointData().getScalars();
          ofunwid.setDataArray(dataArray.getData());
          ofunwid.applyOpacity(ofun);

          ofunwid.setColorTransferFunction(ctfun);
          ctfun.onModified(() => {
              ofunwid.render();
              renderWindow.render();
          });          
          renderer.addVolume(actor[renderingMode]);
        } else {
            renderer.addActor(actor[renderingMode]);
            renderer.getActiveCamera().set({ position: [0, 1, 0], viewUp: [0, 0, -1] });
        }

        renderer.resetCamera();
        renderer.resetCameraClippingRange();
        renderWindow.render();
    });
    });

    ofunwid.addGaussian(0.425, 0.5, 0.2, 0.3, 0.2);
    ofunwid.addGaussian(0.75, 1, 0.3, 0, 0);

    ofunwid.setContainer(widgetContainer);
    ofunwid.bindMouseListeners();

    ofunwid.onAnimation((start) => {
    if (start) {
        renderWindow.getInteractor().requestAnimation(ofunwid);
    } else {
        renderWindow.getInteractor().cancelAnimation(ofunwid);
    }
    });

    ofunwid.onOpacityChange(() => {
    ofunwid.applyOpacity(ofun);
    if (!renderWindow.getInteractor().isAnimating()) {
        renderWindow.render();
    }
    });

    let del = document.querySelector("#deleteable");
    if (del != null){
      del.remove();
    }

    if (renderingMode === 1)
      document.querySelector("#root").appendChild(widgetContainer);

    const handleCheckChange = (e) => {
        const value = e.target.checked;
        const name = e.currentTarget.dataset.name;
        widget.set({ [name]: value }); // can be called on either viewWidget or parentWidget
        widgetManager.enablePicking();
        // renderWindow.render();
    };

    const handleIsoValueChange = (e) => {
      const value = Number(e.target.value);
      console.log(value);
      const firstIsoValue = (globalDataRange[0] + globalDataRange[1]) / value;
      marchingCube.setContourValue(firstIsoValue);
      renderWindow.render();
    }    

    const handleObjectChange = (e) => {

      const index = Number(e.target.value)
      reader.setUrl(URLs[index]).then(() => {
        reader.loadData().then(() => {
            const image = reader.getOutputData();
            // add volume to renderer
            if (renderingMode === 1){
                // update crop widget
                widget.copyImageDataDescription(image);
                const cropState = widget.getWidgetState().getCroppingPlanes();
                cropState.onModified(() => {
                const planes = getCroppingPlanes(image, cropState.getPlanes());
                mapper[renderingMode].removeAllClippingPlanes();
                planes.forEach((plane) => {
                    mapper[renderingMode].addClippingPlane(plane);
                });
                mapper[renderingMode].modified();
                });
                renderer.addVolume(actor[renderingMode]);
            } else {
                globalDataRange = image.getPointData().getScalars().getRange();
                const firstIsoValue = (globalDataRange[0] + globalDataRange[1]) / 3;
                marchingCube.setContourValue(firstIsoValue);
                renderer.addActor(actor[renderingMode]);
                // renderer.getActiveCamera().set({ position: [0, 1, 0], viewUp: [0, 0, -1] });
            }
    
            renderer.resetCamera();
            renderer.resetCameraClippingRange();
            renderWindow.render();
        });
        }); 

    }

    return (
      
        <div style={{
            zIndex:"2", 
            position: "absolute"
        }}>
            <table style = {{
                    background: "white"
                }}>
                <tbody>
                    <select
                        // value={urlIndex}
                        style={{ width: '100%' }}
                        onInput={handleObjectChange}
                    >
                        <option value="0">head</option>
                        <option value="1">chest</option>
                    </select>
                </tbody>
                <tbody>
                    <select
                        value={renderingMode}
                        style={{ width: '100%' }}
                        onInput={(ev) => setRenderingMode(Number(ev.target.value))}
                    >
                        <option value="0">surface rendering</option>
                        <option value="1">ray casting rendering</option>
                    </select>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>pickable</span>
                    <input data-name="pickable" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>visibility</span>
                    <input data-name="visibility" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>contextVisibility</span>
                    <input data-name="contextVisibility" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>handleVisibility</span>
                    <input data-name="handleVisibility" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>faceHandlesEnabled</span>
                    <input data-name="faceHandlesEnabled" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>edgeHandlesEnabled</span>
                    <input data-name="edgeHandlesEnabled" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'none':'flex'}}
                >
                    <span>cornerHandlesEnabled</span>
                    <input data-name="cornerHandlesEnabled" type="checkbox" defaultChecked = {true} onChange = {handleCheckChange}/>
                </tbody>
                <tbody
                    style={{display:renderingMode===0?'flex':'none'}}
                >
                    <span>Iso value: </span>
                    <input
                        type="range"
                        min="0"
                        max="6"
                        step="0.05"
                        defaultValue={3}
                        // value={3}
                        onChange={handleIsoValueChange}
                    />
                </tbody>
            </table>
      </div>
    

    
    );
}

export default App;
