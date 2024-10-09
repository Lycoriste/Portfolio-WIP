import React, { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber"
// import { EffectComposer, Noise, Vignette, Bloom } from '@react-three/postprocessing'
import { BlendFunction, EffectComposer as FXC, EffectPass, RenderPass, NoiseEffect, VignetteEffect, BloomEffect } from "postprocessing";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import gsap from "gsap";
// import { Stats } from "@react-three/drei";
import * as THREE from 'three';

type BackgroundProps = {
    backgroundNumber: number;
    current: string;
}

export const Background: React.FC<BackgroundProps> = React.memo(({ backgroundNumber, current }) => {
    const futureGadgetLab = useLoader(GLTFLoader, "/models/lab/scene.gltf");
    const Blank = () => {
        return (
            <mesh geometry={new THREE.BoxGeometry(0.00001, 0.00001, 0.00001)} material={new THREE.MeshBasicMaterial({ wireframe: true })} visible={backgroundNumber == 0} />
        );
    }

    const Sphere = (() => {
        const { camera } = useThree();
        const sphereRef = useRef<THREE.Mesh>(null);
        if (backgroundNumber == 1) {
            useEffect(() => {
                gsap.globalTimeline.clear();
                const cameraTarget = new THREE.Vector3(0, 0, 0);
                camera.position.set(0, 1, 0);
                camera.lookAt(cameraTarget);

                gsap.to(sphereRef.current!.rotation, {
                    y: Math.PI,
                    duration: 3,
                    repeat: -1,
                    ease: "none"
                });
            }, [])
        };

        return (
            <Suspense>
                <mesh ref={sphereRef} geometry={new THREE.SphereGeometry(6, 8, 8)} material={new THREE.MeshBasicMaterial({ wireframe: true })} position={new THREE.Vector3(0, -5, 0)} visible={backgroundNumber == 1} />
            </Suspense>
        );
    });

    const Lab = () => {
        const { scene, camera, gl } = useThree();
        // 'Tab' : [CameraPosition, CameraLookAt]
        let cameraTarget = new THREE.Vector3(0.345, 1.8, -10);
        const cameraLocations: { [key: string]: THREE.Vector3[] } = {
            Home: [new THREE.Vector3(0.345, 2.5, 5.5), new THREE.Vector3(0.345, 1.8, -10)],
            About: [new THREE.Vector3(0.05, 1.8, -0.5), new THREE.Vector3(1, 1.8, -10)]
        };

        const spotlightRef = useRef<THREE.SpotLight>(null);
        const spotlightTargetRef = useRef(new THREE.Object3D());

        if (backgroundNumber == 2) {
            useEffect(() => {
                console.log("backgroundNumber " + backgroundNumber + " current " + current);
                if (spotlightRef.current) {
                    spotlightRef.current.target = spotlightTargetRef.current;
                }

                try {
                    const newCameraTarget = cameraLocations[current][1];

                    gsap.to(cameraTarget, {
                        x: newCameraTarget.x,
                        y: newCameraTarget.y,
                        z: newCameraTarget.z,
                        duration: 1.5,
                        onUpdate() {
                            camera.lookAt(cameraTarget)
                        }
                    });

                    gsap.to(camera.position, {
                        x: cameraLocations[current][0].x,
                        y: cameraLocations[current][0].y,
                        z: cameraLocations[current][0].z,
                        duration: 1.5,
                    });
                } catch (error) {
                    console.log('Failed to get location, rendering fallback.');
                    console.log('Error: ' + error);
                    gsap.killTweensOf(camera.position);
                    gsap.killTweensOf(cameraTarget);
                    cameraTarget = cameraLocations['Home'][1];
                    camera.position.copy(cameraLocations['Home'][0]);
                    camera.lookAt(cameraTarget);
                }
            }, [current]);
        }

        const lighting = useMemo(() => {
            if (backgroundNumber == 2) {
                return (
                    <>
                        <ambientLight intensity={0.2} color={'#B6FFEC'} />
                        <directionalLight position={[5, 10, 5]} intensity={0.7} color={'#B6FFEC'} />
                        <pointLight position={[0.3, 1.4, 0.4]} intensity={3} distance={3.5} decay={1} color={'#fcf6b3'} />
                        <spotLight
                            ref={spotlightRef}
                            position={[0.3, 1.4, 0.4]}
                            intensity={5}
                            distance={5}
                            castShadow={true}
                            angle={Math.PI / 3}
                            penumbra={1}
                            decay={0.01}
                            color={'#fcf6b3'}
                        />
                    </>
                );
            } else return null;
        }, [])

        const PostProcessingEffects = () => {
            if (backgroundNumber == 2) {
                const composer = useMemo(() => {
                    const composer = new FXC(gl,
                        {
                            multisampling: 0
                        });

                    // Postprocessing Effects
                    const bloomEffect = new BloomEffect({ luminanceThreshold: 0.05, luminanceSmoothing: 0.5, intensity: 3.5 });
                    const vignetteEffect = new VignetteEffect({ offset: 0.15, darkness: 0.83, eskil: false, blendFunction: BlendFunction.NORMAL });
                    const noiseEffect = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.ADD });

                    // Instantiate EffectPass
                    const effectPass = new EffectPass(camera, noiseEffect, vignetteEffect, bloomEffect);
                    effectPass.renderToScreen = true;

                    // Add passes
                    composer.addPass(new RenderPass(scene, camera));
                    composer.addPass(effectPass);

                    return composer;
                }, []);

                useEffect(() => {
                    return () => { composer.dispose() }
                }, [composer]);
                useFrame((_state, delta) => {
                    composer.render(delta);
                }, 1);
            }
            return null;
        };

        return (
            <>
                <Suspense fallback={<Sphere />}>
                    {lighting}
                    <primitive object={spotlightTargetRef.current} position={[0.5, -5, 6]} visible={backgroundNumber == 2} />
                    <primitive object={futureGadgetLab.scene} visible={backgroundNumber == 2} />
                    <PostProcessingEffects />
                </Suspense>
            </>
        );
    }

    return (
        <div className='flex page-padding w-full h-full absolute -z-50'>
            <Canvas camera={{ fov: 75, near: 0.001, far: 20, position: [0, 1, 0] }} >
                <Blank />
                <Sphere />
                <Lab />
                {/* <Stats /> */}
            </Canvas>
        </div>
    )
}, (prev, next) => {
    return prev.backgroundNumber == next.backgroundNumber && next.backgroundNumber == 1;
});

// try {
//     background = (
//         <Canvas camera={{ fov: 75, near: 0.001, far: 20, position: [0, 1, 0] }} >
//             <mesh visible={backgroundNumber == 0} />
//             <Sphere />
//             <Lab />
//             <Stats />
//         </Canvas>
//     );
// } catch (error) {
//     console.log("An error has occured with loading three.js background.\nError: " + error);
//     <Canvas camera={{ fov: 75, near: 0.001, far: 20, position: [0, 1, 0] }} >
//         <Sphere />
//     </Canvas>
// }

{/* Postprocessing Effects */ }
{/* 
<EffectComposer disableNormalPass={true} autoClear={false} multisampling={0} resolutionScale={0.2}>
    <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
    />
    <Vignette
        offset={0.15}
        darkness={0.83}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
    />
    <Bloom
        luminanceThreshold={0.05}
        luminanceSmoothing={0.5}
        intensity={2}
    />
</EffectComposer> 
*/}