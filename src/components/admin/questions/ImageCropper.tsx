import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Crop as CropIcon, Maximize2 } from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  fileName?: string;
}

const ASPECT_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
] as const;

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png', 1);
  });
}

export function ImageCropper({ open, onOpenChange, imageSrc, onCropComplete, fileName = 'cropped.png' }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectOption, setAspectOption] = useState('free');
  const imgRef = useRef<HTMLImageElement>(null);

  const aspect = aspectOption === 'free' ? undefined
    : aspectOption === '1:1' ? 1
    : aspectOption === '4:3' ? 4 / 3
    : 16 / 9;

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = aspect
      ? centerAspectCrop(width, height, aspect)
      : centerCrop(makeAspectCrop({ unit: '%', width: 90 }, width / height, width, height), width, height);
    setCrop(initialCrop);
  }, [aspect]);

  const handleAspectChange = (value: string) => {
    if (!value) return;
    setAspectOption(value);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const newAspect = value === 'free' ? width / height
        : value === '1:1' ? 1
        : value === '4:3' ? 4 / 3
        : 16 / 9;
      setCrop(centerAspectCrop(width, height, newAspect));
    }
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const file = new File([blob], fileName, { type: 'image/png' });
      onCropComplete(file);
      onOpenChange(false);
    } catch (err) {
      console.error('Crop failed:', err);
    }
  };

  const handleSkip = () => {
    // Use original without cropping
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Crop Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col items-center gap-3 min-h-0">
          <ToggleGroup type="single" value={aspectOption} onValueChange={handleAspectChange} className="shrink-0">
            {ASPECT_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value} size="sm" className="text-xs px-3">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[60vh] max-w-full object-contain"
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={handleSkip} className="flex items-center gap-1.5">
            <Maximize2 className="h-4 w-4" />
            Use Original
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!completedCrop}>
            <CropIcon className="h-4 w-4 mr-1.5" />
            Crop & Use
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
