import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    // Prevent multiple initializations in React 18 strict mode
    if (scannerRef.current) return;

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      videoConstraints: {
        facingMode: "environment" // Force rear camera on mobile
      }
    };

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      config,
      /* verbose= */ false
    );
    
    scannerRef.current = html5QrcodeScanner;

    html5QrcodeScanner.render((decodedText, decodedResult) => {
      // Clear scanner on success so it doesn't keep scanning the same code rapidly
      html5QrcodeScanner.pause();
      if (onScanSuccess) {
        onScanSuccess(decodedText, decodedResult);
      }
      // Resume after 2 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.resume();
        }
      }, 2000);
    }, onScanError);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="camera-viewfinder">
      <div id="reader" style={{ width: '100%', borderRadius: '20px', overflow: 'hidden' }}></div>
      <div className="viewfinder-frame" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <div className="corner top-left"></div>
        <div className="corner top-right"></div>
        <div className="corner bottom-left"></div>
        <div className="corner bottom-right"></div>
        <div className="scan-line"></div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
