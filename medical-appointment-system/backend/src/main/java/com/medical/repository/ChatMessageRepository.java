package com.medical.repository;

import com.medical.entity.ChatMessage;
import com.medical.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m " +
            "WHERE (m.sender.id = :userAId AND m.recipient.id = :userBId) " +
            "   OR (m.sender.id = :userBId AND m.recipient.id = :userAId) " +
            "ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversation(@Param("userAId") Long userAId, @Param("userBId") Long userBId);

    @Query("SELECT DISTINCT u FROM User u " +
            "WHERE u.id IN (" +
            "   SELECT m.sender.id FROM ChatMessage m WHERE m.recipient.id = :adminId " +
            "   UNION " +
            "   SELECT m.recipient.id FROM ChatMessage m WHERE m.sender.id = :adminId" +
            ")")
    List<User> findChatPartnersForAdmin(@Param("adminId") Long adminId);

    long countByRecipientAndIsReadFalse(User recipient);

    @Query("SELECT COUNT(m) FROM ChatMessage m " +
            "WHERE m.recipient.id = :recipientId AND m.sender.id = :senderId AND m.isRead = false")
    long countUnreadFromSender(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);

    @Query("SELECT m FROM ChatMessage m " +
            "WHERE (m.sender.id = :userAId AND m.recipient.id = :userBId) " +
            "   OR (m.sender.id = :userBId AND m.recipient.id = :userAId) " +
            "ORDER BY m.createdAt DESC LIMIT 1")
    ChatMessage findLastMessage(@Param("userAId") Long userAId, @Param("userBId") Long userBId);
}
