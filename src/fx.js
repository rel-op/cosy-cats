import * as THREE from 'three';

// Tiny particle effects: hearts, dust poofs and pond ripples.
export class Fx {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.parts = [];

    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-1.1, 0.2, -0.5, 1.0, 0, 0.45);
    s.bezierCurveTo(0.5, 1.0, 1.1, 0.2, 0, -0.5);
    this.heartGeo = new THREE.ShapeGeometry(s, 8);
    this.ballGeo = new THREE.SphereGeometry(1, 8, 6);
    this.ringGeo = new THREE.RingGeometry(0.8, 1, 28);
    this.ringGeo.rotateX(-Math.PI / 2);
  }

  spawn(geo, color, pos, vel, life, size, kind) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    this.parts.push({ mesh, vel, life, age: 0, size, kind });
  }

  hearts(pos, n = 3) {
    for (let i = 0; i < n; i++) {
      const p = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5));
      this.spawn(this.heartGeo, '#ff8fb0', p, new THREE.Vector3(0, 0.7 + Math.random() * 0.3, 0), 1.3 + Math.random() * 0.4, 0.14, 'heart');
    }
  }

  poof(pos, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawn(this.ballGeo, '#ffffff', pos.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(Math.cos(a) * 1.2, 0.5, Math.sin(a) * 1.2), 0.45, 0.1, 'poof');
    }
  }

  ripple(pos) {
    const p = pos.clone();
    p.y = 0.04;
    this.spawn(this.ringGeo, '#ffffff', p, new THREE.Vector3(), 0.9, 0.9, 'ripple');
  }

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      const k = p.age / p.life;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.kind === 'heart') {
        p.mesh.quaternion.copy(this.camera.quaternion);
        p.mesh.scale.setScalar(p.size * Math.min(1, p.age * 6));
        p.mesh.material.opacity = k > 0.6 ? (1 - k) / 0.4 : 1;
      } else if (p.kind === 'poof') {
        p.vel.multiplyScalar(1 - Math.min(1, dt * 4));
        p.mesh.scale.setScalar(p.size * (0.6 + k));
        p.mesh.material.opacity = 0.8 * (1 - k);
      } else {
        p.mesh.scale.setScalar(0.2 + p.size * k);
        p.mesh.material.opacity = 0.7 * (1 - k);
      }
      if (k >= 1) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
      }
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }
}
