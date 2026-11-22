import * as THREE from 'three';

// Tiny particle effects: hearts, dust poofs, pond ripples, sleepy z's.
export class Fx {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.parts = [];
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-1.1, 0.2, -0.5, 1.0, 0, 0.45);
    s.bezierCurveTo(0.5, 1.0, 1.1, 0.2, 0, -0.5);
    this.heartGeo = new THREE.ShapeGeometry(s, 4);
    this.ballGeo = new THREE.SphereGeometry(1, 6, 4);
    this.ringGeo = new THREE.RingGeometry(0.78, 1, 20);
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
      this.spawn(this.heartGeo, '#ff8fb0', p, new THREE.Vector3(0, 0.6 + Math.random() * 0.3, 0), 1.4 + Math.random() * 0.4, 0.15, 'heart');
    }
  }

  poof(pos, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawn(this.ballGeo, '#fffaf0', pos.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(Math.cos(a) * 1.2, 0.5, Math.sin(a) * 1.2), 0.45, 0.1, 'poof');
    }
  }

  ripple(pos, y = 0.05) {
    const p = pos.clone();
    p.y = y;
    this.spawn(this.ringGeo, '#ffffff', p, new THREE.Vector3(), 0.9, 0.9, 'ripple');
  }

  clear() {
    for (const p of this.parts) { this.scene.remove(p.mesh); p.mesh.material.dispose(); }
    this.parts = [];
  }

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      const k = p.age / p.life;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.kind === 'heart') {
        p.mesh.quaternion.copy(this.camera.quaternion);
        p.mesh.scale.setScalar(p.size * Math.min(1, p.age * 6));
        p.mesh.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
      } else if (p.kind === 'poof') {
        p.vel.multiplyScalar(1 - Math.min(1, dt * 4));
        p.mesh.scale.setScalar(p.size * (0.6 + k));
        p.mesh.material.opacity = 0.85 * (1 - k);
      } else {
        p.mesh.scale.setScalar(0.2 + p.size * k);
        p.mesh.material.opacity = 0.7 * (1 - k);
      }
      if (k >= 1) { this.scene.remove(p.mesh); p.mesh.material.dispose(); }
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }
}
