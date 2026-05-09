package com.medical.service.storage;

import com.medical.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;

@Service
public class AvatarStorageService {

    @Value("${app.files.avatar-max-size-bytes:10485760}")
    private long maxAvatarSize;

    public String storeAvatar(MultipartFile file, Long userId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Avatar file is empty", "EMPTY_AVATAR_FILE");
        }
        if (file.getSize() > maxAvatarSize) {
            throw new BusinessException("Avatar file is too large (max 10MB)", "AVATAR_TOO_LARGE");
        }

        try {
            byte[] bytes = file.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            return "data:" + mimeType + ";base64," + base64;
        } catch (IOException ex) {
            throw new BusinessException("Failed to process avatar", "AVATAR_UPLOAD_ERROR");
        }
    }
}
