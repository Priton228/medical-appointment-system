import { useEffect, useRef, useState } from 'react';

interface AuthCatProps {
  isPasswordField?: boolean;
  isEmailField?: boolean;
  isTextField?: boolean;
  isDarkMode?: boolean;
}

const AuthCat: React.FC<AuthCatProps> = ({ isPasswordField, isEmailField, isTextField, isDarkMode }) => {
  const catSvgRef = useRef<SVGSVGElement>(null);
  const leftPupilRef = useRef<SVGEllipseElement>(null);
  const rightPupilRef = useRef<SVGEllipseElement>(null);
  const leftHighlightRef = useRef<SVGCircleElement>(null);
  const rightHighlightRef = useRef<SVGCircleElement>(null);
  const leftHighlightSmallRef = useRef<SVGCircleElement>(null);
  const rightHighlightSmallRef = useRef<SVGCircleElement>(null);
  const blushGroupRef = useRef<SVGGElement>(null);
  const pawsGroupRef = useRef<SVGGElement>(null);
  const earsGroupRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [currentTarget, setCurrentTarget] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const tailAngleRef = useRef(0);

  // Animate eyes following the target
  useEffect(() => {
    const animateEyes = () => {
      const diffX = currentTarget.x - currentPosition.x;
      const diffY = currentTarget.y - currentPosition.y;
      
      const newPosition = {
        x: currentPosition.x + diffX * 0.1,
        y: currentPosition.y + diffY * 0.1
      };
      
      setCurrentPosition(newPosition);
      
      const maxOffset = 7;
      const limitedX = Math.max(-maxOffset, Math.min(maxOffset, newPosition.x));
      const limitedY = Math.max(-maxOffset, Math.min(maxOffset, newPosition.y));
      
      const leftBaseX = 88;
      const rightBaseX = 132;
      const baseY = 106;
      
      if (leftPupilRef.current) {
        leftPupilRef.current.setAttribute('cx', String(leftBaseX + limitedX));
        leftPupilRef.current.setAttribute('cy', String(baseY + limitedY));
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.setAttribute('cx', String(rightBaseX + limitedX));
        rightPupilRef.current.setAttribute('cy', String(baseY + limitedY));
      }
      
      if (leftHighlightRef.current) {
        leftHighlightRef.current.setAttribute('cx', String(85 + limitedX * 0.4));
        leftHighlightRef.current.setAttribute('cy', String(102 + limitedY * 0.4));
      }
      if (rightHighlightRef.current) {
        rightHighlightRef.current.setAttribute('cx', String(129 + limitedX * 0.4));
        rightHighlightRef.current.setAttribute('cy', String(102 + limitedY * 0.4));
      }
      
      if (leftHighlightSmallRef.current) {
        leftHighlightSmallRef.current.setAttribute('cx', String(91 + limitedX * 0.25));
        leftHighlightSmallRef.current.setAttribute('cy', String(110 + limitedY * 0.25));
      }
      if (rightHighlightSmallRef.current) {
        rightHighlightSmallRef.current.setAttribute('cx', String(135 + limitedX * 0.25));
        rightHighlightSmallRef.current.setAttribute('cy', String(110 + limitedY * 0.25));
      }
      
      animationFrameRef.current = requestAnimationFrame(animateEyes);
    };
    
    animationFrameRef.current = requestAnimationFrame(animateEyes);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentPosition, currentTarget]);

  // Animate tail
  useEffect(() => {
    const animateTail = () => {
      tailAngleRef.current += 0.03;
      const offsetX = Math.sin(tailAngleRef.current) * 4;
      const offsetY = Math.cos(tailAngleRef.current * 0.7) * 2;
      
      if (tailRef.current) {
        const points = `M55,160 Q${35 + offsetX},${157 + offsetY} ${30 + offsetX},${135 + offsetY} Q${28 + offsetX},${120 + offsetY} ${36 + offsetX},${113 + offsetY}`;
        tailRef.current.setAttribute('d', points);
      }
      
      requestAnimationFrame(animateTail);
    };
    
    const tailAnimation = requestAnimationFrame(animateTail);
    return () => cancelAnimationFrame(tailAnimation);
  }, []);

  // Blink animation
  useEffect(() => {
    const blink = () => {
      if (pawsGroupRef.current?.style.display === 'block') return;
      
      const leftEye = catSvgRef.current?.querySelector('.cat-eye-left') as SVGEllipseElement | null;
      const rightEye = catSvgRef.current?.querySelector('.cat-eye-right') as SVGEllipseElement | null;
      
      if (leftEye && rightEye) {
        leftEye.style.transition = 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
        rightEye.style.transition = 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
        leftEye.style.transform = 'scaleY(0.05)';
        rightEye.style.transform = 'scaleY(0.05)';
        leftEye.style.transformOrigin = 'center';
        rightEye.style.transformOrigin = 'center';
        
        setTimeout(() => {
          leftEye.style.transform = '';
          rightEye.style.transform = '';
        }, 120);
      }
    };
    
    const interval = setInterval(blink, 3800);
    return () => clearInterval(interval);
  }, []);

  // React to field focus changes
  useEffect(() => {
    if (isPasswordField) {
      // Password field - close eyes with paws
      setCurrentTarget({ x: 0, y: 0 });
      if (blushGroupRef.current) blushGroupRef.current.style.display = 'block';
      if (pawsGroupRef.current) pawsGroupRef.current.style.display = 'block';
      if (earsGroupRef.current) {
        earsGroupRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)';
        earsGroupRef.current.style.transformOrigin = '110px 110px';
        earsGroupRef.current.style.transform = 'rotate(-2deg)';
        setTimeout(() => {
          if (earsGroupRef.current) earsGroupRef.current.style.transform = '';
        }, 450);
      }
    } else if (isEmailField || isTextField) {
      // Email or text field - look to the right
      setCurrentTarget({ x: 7, y: 0 });
      if (blushGroupRef.current) blushGroupRef.current.style.display = 'none';
      if (pawsGroupRef.current) pawsGroupRef.current.style.display = 'none';
      if (earsGroupRef.current) {
        earsGroupRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)';
        earsGroupRef.current.style.transformOrigin = '110px 110px';
        earsGroupRef.current.style.transform = 'rotate(3deg)';
        setTimeout(() => {
          if (earsGroupRef.current) earsGroupRef.current.style.transform = '';
        }, 450);
      }
    } else {
      // Idle - look straight
      setCurrentTarget({ x: 0, y: 0 });
      if (blushGroupRef.current) blushGroupRef.current.style.display = 'none';
      if (pawsGroupRef.current) pawsGroupRef.current.style.display = 'none';
    }
  }, [isPasswordField, isEmailField, isTextField]);

  return (
    <svg ref={catSvgRef} viewBox="0 0 220 270" className="w-80 h-96 cursor-pointer transition-transform hover:scale-[1.02]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="eyeGradLight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#64b5f6" />
          <stop offset="100%" stopColor="#2196f3" />
        </radialGradient>
        <radialGradient id="eyeGradDark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#42a5f5" />
          <stop offset="100%" stopColor="#1565c0" />
        </radialGradient>
        <radialGradient id="pillowBlueTop" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#7eb8e0" />
          <stop offset="30%" stopColor="#5a9bd5" />
          <stop offset="60%" stopColor="#3a7dc8" />
          <stop offset="85%" stopColor="#2a6ab5" />
          <stop offset="100%" stopColor="#1e5a9e" />
        </radialGradient>
        <linearGradient id="pillowBlueSide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a6ab5" />
          <stop offset="50%" stopColor="#1e5a9e" />
          <stop offset="100%" stopColor="#154a82" />
        </linearGradient>
        <radialGradient id="pillowShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
        </radialGradient>
      </defs>
      
      {/* Shadow under pillow */}
      <ellipse cx="110" cy="242" rx="80" ry="14" fill="url(#pillowShadow)" />
      
      {/* Pillow side */}
      <path d="M30,218 Q30,240 110,240 Q190,240 190,218 L190,226 Q190,248 110,248 Q30,248 30,226 Z" fill="url(#pillowBlueSide)" />
      
      {/* Main pillow */}
      <ellipse cx="110" cy="218" rx="80" ry="26" fill="url(#pillowBlueTop)" />
      <ellipse cx="110" cy="216" rx="68" ry="20" fill="#8ec8f0" opacity="0.35" />
      <ellipse cx="110" cy="222" rx="55" ry="11" fill="#2a6ab5" opacity="0.25" />
      
      {/* Pillow creases */}
      <path d="M42,216 Q80,210 110,213 Q140,216 178,215" stroke="#1e5a9e" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M45,223 Q110,218 175,223" stroke="#1e5a9e" strokeWidth="1" fill="none" opacity="0.35" />
      
      {/* Tail */}
      <path ref={tailRef} d="M55,160 Q35,157 30,135 Q28,120 36,113" stroke={isDarkMode ? "#4a4a60" : "#c0c8d0"} strokeWidth="7" fill="none" strokeLinecap="round" />
      
      {/* Body */}
      <ellipse cx="110" cy="168" rx="52" ry="40" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"} className="cat-body" />
      <ellipse cx="110" cy="175" rx="28" ry="22" fill={isDarkMode ? "#35354a" : "#f0f8ff"} className="cat-chest" opacity="0.5" />
      
      {/* Body stripes */}
      <path d="M90,153 Q110,149 130,153" stroke={isDarkMode ? "#4a4a60" : "#b8c8d8"} strokeWidth="2.5" fill="none" opacity="0.4" />
      <path d="M88,163 Q110,159 132,163" stroke={isDarkMode ? "#4a4a60" : "#b8c8d8"} strokeWidth="2.5" fill="none" opacity="0.4" />
      <path d="M90,173 Q110,170 130,173" stroke={isDarkMode ? "#4a4a60" : "#b8c8d8"} strokeWidth="2.5" fill="none" opacity="0.4" />
      
      {/* Head */}
      <circle cx="110" cy="110" r="47" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"} className="cat-head" />
      
      {/* Ears */}
      <g ref={earsGroupRef} className="ears-group">
        <polygon points="68,80 56,40 92,68" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"} className="cat-ear-left" />
        <polygon points="70,75 62,52 89,69" fill={isDarkMode ? "#ff8888" : "#ffccd5"} className="cat-ear-inner-left" opacity="0.7" />
        <polygon points="152,80 164,40 128,68" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"} className="cat-ear-right" />
        <polygon points="150,75 158,52 131,69" fill={isDarkMode ? "#ff8888" : "#ffccd5"} className="cat-ear-inner-right" opacity="0.7" />
      </g>
      
      {/* Face */}
      <ellipse cx="110" cy="115" rx="34" ry="30" fill={isDarkMode ? "#303045" : "#f0f8ff"} className="cat-face" opacity="0.6" />
      
      {/* Forehead stripes */}
      <path d="M103,95 Q110,91 117,95" stroke={isDarkMode ? "#4a4a60" : "#b8c8d8"} strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M105,89 Q110,85 115,89" stroke={isDarkMode ? "#4a4a60" : "#b8c8d8"} strokeWidth="2" fill="none" opacity="0.5" />
      
      {/* Eyes */}
      <g id="eyesGroup">
        <ellipse cx="88" cy="106" rx="14" ry="15" fill={isDarkMode ? "url(#eyeGradDark)" : "url(#eyeGradLight)"} className="cat-eye-left" />
        <ellipse cx="132" cy="106" rx="14" ry="15" fill={isDarkMode ? "url(#eyeGradDark)" : "url(#eyeGradLight)"} className="cat-eye-right" />
        
        <ellipse ref={leftPupilRef} cx="88" cy="106" rx="7.5" ry="10" fill="#1a1a2e" className="pupil left-pupil" />
        <ellipse ref={rightPupilRef} cx="132" cy="106" rx="7.5" ry="10" fill="#1a1a2e" className="pupil right-pupil" />
        
        <circle ref={leftHighlightRef} cx="85" cy="102" r="3" fill="white" className="highlight left-highlight" />
        <circle ref={leftHighlightSmallRef} cx="91" cy="110" r="1.5" fill="white" className="highlight left-highlight-small" opacity="0.6" />
        <circle ref={rightHighlightRef} cx="129" cy="102" r="3" fill="white" className="highlight right-highlight" />
        <circle ref={rightHighlightSmallRef} cx="135" cy="110" r="1.5" fill="white" className="highlight right-highlight-small" opacity="0.6" />
      </g>
      
      {/* Blush */}
      <g ref={blushGroupRef} style={{ display: 'none' }}>
        <ellipse cx="72" cy="122" rx="10" ry="6" fill="#ffb3ba" opacity="0.5" />
        <ellipse cx="148" cy="122" rx="10" ry="6" fill="#ffb3ba" opacity="0.5" />
      </g>
      
      {/* Nose */}
      <polygon points="106,118 114,118 110,124" fill="#ff9e9e" className="cat-nose" />
      
      {/* Mouth */}
      <path d="M100,128 Q110,135 110,128" stroke="#8a8a8a" strokeWidth="1.5" fill="none" className="cat-mouth-left" />
      <path d="M120,128 Q110,135 110,128" stroke="#8a8a8a" strokeWidth="1.5" fill="none" className="cat-mouth-right" />
      
      {/* Whiskers */}
      <g className="whiskers" opacity="0.5">
        <line x1="55" y1="115" x2="78" y2="119" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
        <line x1="52" y1="122" x2="77" y2="124" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
        <line x1="55" y1="129" x2="78" y2="130" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
        <line x1="165" y1="115" x2="142" y2="119" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
        <line x1="168" y1="122" x2="143" y2="124" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
        <line x1="165" y1="129" x2="142" y2="130" stroke={isDarkMode ? "#aaa" : "#999"} strokeWidth="1.2" />
      </g>
      
      {/* Paws - hidden by default */}
      <g ref={pawsGroupRef} style={{ display: 'none' }}>
        <ellipse cx="88" cy="106" rx="15" ry="18" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"}>
          <animate attributeName="ry" values="18;14;18" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values="106;108;106" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="83" cy="100" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="100;98;100" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="88" cy="97" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="97;95;97" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="93" cy="100" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="100;98;100" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="88" cy="108" rx="5" ry="3.5" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.6">
          <animate attributeName="cy" values="108;106;108" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
        
        <ellipse cx="132" cy="106" rx="15" ry="18" fill={isDarkMode ? "#2a2a3e" : "#e4f0f7"}>
          <animate attributeName="ry" values="18;14;18" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values="106;108;106" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="127" cy="100" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="100;98;100" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="132" cy="97" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="97;95;97" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="137" cy="100" r="3" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.7">
          <animate attributeName="cy" values="100;98;100" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="132" cy="108" rx="5" ry="3.5" fill={isDarkMode ? "#ff8888" : "#ffccd5"} opacity="0.6">
          <animate attributeName="cy" values="108;106;108" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
      </g>
    </svg>
  );
};

export default AuthCat;
