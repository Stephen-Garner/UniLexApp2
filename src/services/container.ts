import { CachedAiTutorService, EchoAiTutorBackend } from './ai-tutor-service';
import { offlineController } from './offline-controller';
import { bankRepository } from '@/data/repositories/bank-repository';
import { notesRepository } from '@/data/repositories/notes-repository';
import { videoRepository } from '@/data/repositories/video-repository';
import { MmkvProgressRepository } from '@/data/repositories/progress-repository';
import { storageService } from './storage-service';
import { youTubeService } from './youtube-service';
import { audioRecorderService } from './audio-recorder-service';
import { ttsService } from './tts-service';

const aiTutorBackend = new EchoAiTutorBackend();

/** Singleton instance of the AI tutor service with translation caching. */
export const aiTutorService = new CachedAiTutorService(aiTutorBackend);

const progressRepository = new MmkvProgressRepository(bankRepository);

export {
  offlineController,
  bankRepository,
  notesRepository,
  videoRepository,
  storageService,
  youTubeService,
  audioRecorderService,
  ttsService,
  progressRepository,
};
