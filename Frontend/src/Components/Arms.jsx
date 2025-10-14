import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import gsap from 'gsap'

export function Arms(props) {
  const { nodes, materials } = useGLTF('/astronaut_arms.glb')
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const groupRef = useRef()
  const leftArmAnimationRef = useRef()
  const rightArmAnimationRef = useRef()
  const isFloatingRef = useRef(true)

  const handleLeftArmClick = () => {
    // Stop floating animations
    isFloatingRef.current = false
    if (leftArmAnimationRef.current) {
      leftArmAnimationRef.current.kill()
    }
    if (rightArmAnimationRef.current) {
      rightArmAnimationRef.current.kill()
    }

    if (leftArmRef.current) {
      gsap.to(leftArmRef.current.position, {
        x: 2,
        y: 1.5,
        z: -1.5,
        duration: 2,
        ease: 'power2.out'
      })
      // Animate rotation
      gsap.to(leftArmRef.current.rotation, {
        y: - Math.PI / 2,
        x: 0.5,
        duration: 2,
        ease: 'power2.out'
      })
    }
  }

  const handleRightArmClick = () => {
    // Stop floating animations
    isFloatingRef.current = false
    if (leftArmAnimationRef.current) {
      leftArmAnimationRef.current.kill()
    }
    if (rightArmAnimationRef.current) {
      rightArmAnimationRef.current.kill()
    }

    if (rightArmRef.current) {
      gsap.to(rightArmRef.current.position, {
        x: -2,
        y: 1.5,
        z: -1.5,
        duration: 2,
        ease: 'power2.out'
      })
      // Animate rotation
      gsap.to(rightArmRef.current.rotation, {
        y: Math.PI / 2,
        x: 0.5,
        duration: 2,
        ease: 'power2.out'
      })
    }
  }

  const resetLeftArm = () => {
    if (leftArmRef.current) {
      gsap.to(leftArmRef.current.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 3,
        ease: 'power2.out'
      })
      gsap.to(leftArmRef.current.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 3,
        ease: 'power2.out'
      })
    }
  }

  const resetRightArm = () => {
    if (rightArmRef.current) {
      gsap.to(rightArmRef.current.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 3,
        ease: 'power2.out'
      })
      gsap.to(rightArmRef.current.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 3,
        ease: 'power2.out'
      })
    }
  }

  const handleHomeClick = () => {
    // Resume floating animations
    isFloatingRef.current = true
    const maxRotation = (10 * Math.PI) / 180

    const animateLeftArm = () => {
      if (leftArmRef.current && isFloatingRef.current) {
        leftArmAnimationRef.current = gsap.to(leftArmRef.current.rotation, {
          y: (Math.random() - 0.5) * 2 * maxRotation,
          duration: 2 + Math.random() * 2,
          ease: 'sine.inOut',
          onComplete: animateLeftArm
        })
      }
    }

    const animateRightArm = () => {
      if (rightArmRef.current && isFloatingRef.current) {
        rightArmAnimationRef.current = gsap.to(rightArmRef.current.rotation, {
          y: (Math.random() - 0.5) * 2 * maxRotation,
          duration: 2 + Math.random() * 2,
          ease: 'sine.inOut',
          onComplete: animateRightArm
        })
      }
    }

    // Reset arms to original position
    resetLeftArm()
    resetRightArm()

    // Start floating animations after reset
    setTimeout(() => {
      animateLeftArm()
      animateRightArm()
    }, 2000)
  }

  // Individual arm twirling animation with random rotation (max 10 degrees either side)
  useEffect(() => {
    const maxRotation = (10 * Math.PI) / 180 // 10 degrees in radians

    const animateLeftArm = () => {
      if (leftArmRef.current && isFloatingRef.current) {
        leftArmAnimationRef.current = gsap.to(leftArmRef.current.rotation, {
          y: (Math.random() - 0.5) * 2 * maxRotation, // Random between -10 and +10 degrees
          duration: 2 + Math.random() * 2,
          ease: 'sine.inOut',
          onComplete: animateLeftArm
        })
      }
    }

    const animateRightArm = () => {
      if (rightArmRef.current && isFloatingRef.current) {
        rightArmAnimationRef.current = gsap.to(rightArmRef.current.rotation, {
          y: (Math.random() - 0.5) * 2 * maxRotation, // Random between -10 and +10 degrees
          duration: 2 + Math.random() * 2,
          ease: 'sine.inOut',
          onComplete: animateRightArm
        })
      }
    }

    animateLeftArm()
    animateRightArm()
  }, [])

  // Expose the function through a ref prop
  if (props.onLeftArmClickRef) {
    props.onLeftArmClickRef.current = handleLeftArmClick
  }

  if (props.onRightArmClickRef) {
    props.onRightArmClickRef.current = handleRightArmClick
  }

  if (props.onResetLeftArmRef) {
    props.onResetLeftArmRef.current = resetLeftArm
  }

  if (props.onResetRightArmRef) {
    props.onResetRightArmRef.current = resetRightArm
  }

  if (props.onHomeClickRef) {
    props.onHomeClickRef.current = handleHomeClick
  }

  return (
    <group {...props} dispose={null}>
      <group ref={groupRef} scale={0.01}>
        <mesh
          ref={leftArmRef}
          castShadow
          receiveShadow
          geometry={nodes.geo_astronautArm_L_01_mat_astronaut_01_0.geometry}
          material={materials.mat_astronaut_01}
        />
        <mesh
          ref={rightArmRef}
          castShadow
          receiveShadow
          geometry={nodes.geo_astronautArm_R_01_mat_astronaut_01_0.geometry}
          material={materials.mat_astronaut_01}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/astronaut_arms.glb')
// meow-yixiang
