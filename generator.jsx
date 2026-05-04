import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

import CyberBackground from '../components/generator/CyberBackground';
import Header from '../components/generator/Header';
import PromptInput from '../components/generator/PromptInput';
import StyleSelector from '../components/generator/StyleSelector';
import AspectRatioSelector from '../components/generator/AspectRatioSelector';
import GeneratingOverlay from '../components/generator/GeneratingOverlay';
import Gallery from '../components/generator/Gallery';

const STYLE_PROMPTS = {
  realistic: 'ultra realistic, cinematic lighting, highly detailed, 8K resolution, photographic quality',
  cyberpunk: 'cyberpunk style, neon lights, futuristic, dystopian city, rain-soaked streets, holographic displays, 8K',
  digital_art: 'digital art, vibrant colors, artistic style, detailed illustration, concept art, trending on artstation, 8K',
};

export default function Generator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cyberpunk');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const queryClient = useQueryClient();

  const { data: images = [], isLoading: isLoadingImages } = useQuery({
    queryKey: ['generated-images'],
    queryFn: () => base44.entities.GeneratedImage.list('-created_date', 50),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const enhancedPrompt = `${prompt}, ${STYLE_PROMPTS[style]}`;

      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: enhancedPrompt,
      });

      await base44.entities.GeneratedImage.create({
        prompt,
        enhanced_prompt: enhancedPrompt,
        style,
        aspect_ratio: aspectRatio,
        image_url: url,
      });

      return url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-images'] });
      toast.success('Image generated successfully!');
      setPrompt('');
    },
    onError: (error) => {
      toast.error('Failed to generate image. Please try again.');
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    generateMutation.mutate();
  };

  const handleClearHistory = async () => {
    for (const img of images) {
      await base44.entities.GeneratedImage.delete(img.id);
    }
    queryClient.invalidateQueries({ queryKey: ['generated-images'] });
    toast.success('History cleared');
  };

  return (
    <div className="min-h-screen bg-background relative font-inter">
      <CyberBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Header />

        {/* Generator Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-5 md:p-7 mb-8 shadow-[0_0_40px_hsl(195_100%_50%/0.05)]"
        >
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onGenerate={handleGenerate}
            onSurprise={setPrompt}
            isGenerating={generateMutation.isPending}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-6 border-t border-border/30">
            <StyleSelector value={style} onChange={setStyle} />
            <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
          </div>
        </motion.div>

        {/* Generating Animation */}
        <GeneratingOverlay isVisible={generateMutation.isPending} />

        {/* Gallery Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="font-orbitron text-sm font-semibold text-foreground tracking-wide">
                Generated Images
              </h2>
              {images.length > 0 && (
                <span className="text-xs font-inter text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {images.length}
                </span>
              )}
            </div>
            {images.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>

          <Gallery images={images} isLoading={isLoadingImages} />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pb-8">
          <p className="text-xs font-inter text-muted-foreground/40">
            Powered by AI · Smart City Image Generator
          </p>
        </div>
      </div>
    </div>
  );
}
