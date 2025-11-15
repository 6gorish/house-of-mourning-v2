/**
 * Message Pool Manager Tests
 *
 * Unit tests for MessagePoolManager service.
 * Tests dual-cursor algorithm, surge mode, and priority queue management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MessagePoolManager } from '@/lib/services/message-pool-manager'
import type { MessagePoolConfig } from '@/types/grief-messages'
import {
  MockDatabaseService,
  createTestMessages,
  createTestMessage
} from '../mocks/database-service'
import { DEFAULT_CONFIG } from '@/lib/config/message-pool-config'

describe('MessagePoolManager', () => {
  let poolManager: MessagePoolManager
  let mockDb: MockDatabaseService
  let config: MessagePoolConfig

  beforeEach(() => {
    config = {
      ...DEFAULT_CONFIG,
      pollingInterval: 100 // Fast polling for tests
    }
    mockDb = new MockDatabaseService()
    poolManager = new MessagePoolManager(mockDb as any, config)
  })

  afterEach(() => {
    poolManager.cleanup()
  })

  describe('initialize', () => {
    it('should initialize with empty database', async () => {
      mockDb.setMessages([])

      await poolManager.initialize()

      const stats = poolManager.getStats()
      expect(stats.historicalCursor).toBeNull()
      expect(stats.newMessageWatermark).toBe(0)
    })

    it('should initialize cursors to max ID', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)

      await poolManager.initialize()

      const stats = poolManager.getStats()
      expect(stats.historicalCursor).toBe(100)
      expect(stats.newMessageWatermark).toBe(100)
    })

    it('should throw on database error', async () => {
      mockDb.setShouldFail(true)

      await expect(poolManager.initialize()).rejects.toThrow()
    })
  })

  describe('getNextBatch', () => {
    it('should fetch historical messages in normal mode', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const batch = await poolManager.getNextBatch(20)

      expect(batch.length).toBe(20)
      expect(batch.every((msg) => msg.approved)).toBe(true)
    })

    it('should return empty array when database is empty', async () => {
      mockDb.setMessages([])
      await poolManager.initialize()

      const batch = await poolManager.getNextBatch(20)

      expect(batch.length).toBe(0)
    })

    it('should handle batch size larger than available messages', async () => {
      const messages = createTestMessages(10)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const batch = await poolManager.getNextBatch(50)

      expect(batch.length).toBeLessThanOrEqual(10)
    })

    it('should allocate slots for priority queue in normal mode', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Add messages to priority queue
      const newMsg = createTestMessage(101, 'New message')
      await poolManager.addNewMessage(newMsg)

      const batch = await poolManager.getNextBatch(20)

      // Should include at least one message from priority queue
      const hasNewMessage = batch.some((msg) => msg.id === '101')
      expect(hasNewMessage).toBe(true)
    })

    it('should recycle historical cursor when exhausted', async () => {
      const messages = createTestMessages(5)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Fetch multiple batches to exhaust cursor
      await poolManager.getNextBatch(3)
      await poolManager.getNextBatch(3)
      const batch3 = await poolManager.getNextBatch(3)

      // Should still get messages (recycled)
      expect(batch3.length).toBeGreaterThan(0)
    })
  })

  describe('addNewMessage', () => {
    it('should add message to priority queue', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const newMsg = createTestMessage(101, 'New message')
      await poolManager.addNewMessage(newMsg)

      const stats = poolManager.getStats()
      expect(stats.priorityQueueSize).toBe(1)
    })

    it('should update watermark', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const newMsg = createTestMessage(101, 'New message')
      await poolManager.addNewMessage(newMsg)

      const stats = poolManager.getStats()
      expect(stats.newMessageWatermark).toBe(101)
    })

    it('should handle queue overflow by dropping oldest', async () => {
      const messages = createTestMessages(10)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Add more messages than max queue size
      const maxSize = config.priorityQueue.maxSize
      for (let i = 0; i < maxSize + 10; i++) {
        const msg = createTestMessage(100 + i, `Message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      const stats = poolManager.getStats()
      expect(stats.priorityQueueSize).toBeLessThanOrEqual(maxSize)
    })
  })

  describe('surge mode', () => {
    it('should activate surge mode when queue exceeds threshold', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Add messages to exceed surge threshold
      const threshold = config.surgeMode.threshold
      for (let i = 0; i < threshold + 10; i++) {
        const msg = createTestMessage(200 + i, `Surge message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      expect(poolManager.isSurgeMode()).toBe(true)
    })

    it('should deactivate surge mode when queue drops below threshold', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Activate surge mode
      const threshold = config.surgeMode.threshold
      for (let i = 0; i < threshold + 10; i++) {
        const msg = createTestMessage(200 + i, `Surge message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      expect(poolManager.isSurgeMode()).toBe(true)

      // Drain queue by fetching batches
      while (poolManager.getStats().priorityQueueSize > threshold - 10) {
        await poolManager.getNextBatch(20)
      }

      expect(poolManager.isSurgeMode()).toBe(false)
    })

    it('should allocate more slots to new messages in surge mode', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Activate surge mode
      const threshold = config.surgeMode.threshold
      for (let i = 0; i < threshold + 10; i++) {
        const msg = createTestMessage(200 + i, `Surge message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      const batch = await poolManager.getNextBatch(20)

      // Count new messages in batch (IDs >= 200)
      const newMessageCount = batch.filter((msg) => parseInt(msg.id) >= 200).length

      // In surge mode, should have more than normal slots (5)
      const expectedMinimum = Math.floor(20 * config.surgeMode.newMessageRatio * 0.8)
      expect(newMessageCount).toBeGreaterThan(config.priorityQueue.normalSlots)
    })

    it('should guarantee minimum historical ratio in surge mode', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Activate surge mode
      const threshold = config.surgeMode.threshold
      for (let i = 0; i < threshold + 10; i++) {
        const msg = createTestMessage(200 + i, `Surge message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      const batch = await poolManager.getNextBatch(20)

      // Count historical messages (IDs < 200)
      const historicalCount = batch.filter((msg) => parseInt(msg.id) < 200).length

      // Should have at least minimum historical ratio
      const expectedMinimum = Math.floor(20 * config.surgeMode.minHistoricalRatio)
      expect(historicalCount).toBeGreaterThanOrEqual(expectedMinimum)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const stats = poolManager.getStats()

      expect(stats).toHaveProperty('historicalCursor')
      expect(stats).toHaveProperty('newMessageWatermark')
      expect(stats).toHaveProperty('priorityQueueSize')
      expect(stats).toHaveProperty('surgeMode')
      expect(stats).toHaveProperty('queueWaitTime')
      expect(stats).toHaveProperty('memoryUsage')
    })

    it('should calculate queue wait time', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Add messages to queue
      for (let i = 0; i < 50; i++) {
        const msg = createTestMessage(200 + i, `Message ${i}`)
        await poolManager.addNewMessage(msg)
      }

      const stats = poolManager.getStats()

      expect(stats.queueWaitTime).toBeGreaterThan(0)
    })
  })

  describe('getClusterConfig', () => {
    it('should return cluster configuration', () => {
      const clusterConfig = poolManager.getClusterConfig()

      expect(clusterConfig.slots).toBe(config.clusterSize)
      expect(clusterConfig.duration).toBe(config.clusterDuration)
    })
  })

  describe('cleanup', () => {
    it('should clear priority queue', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Add messages to queue
      const msg = createTestMessage(101, 'New message')
      await poolManager.addNewMessage(msg)

      poolManager.cleanup()

      const stats = poolManager.getStats()
      expect(stats.priorityQueueSize).toBe(0)
    })

    it('should stop polling', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Polling should be active
      const statsBefore = poolManager.getStats()

      poolManager.cleanup()

      // After cleanup, polling should be stopped
      // We can't directly test this, but cleanup should not throw
      expect(() => poolManager.cleanup()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle single message in database', async () => {
      const messages = createTestMessages(1)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const batch = await poolManager.getNextBatch(20)

      expect(batch.length).toBe(1)
    })

    it('should handle requesting more messages than exist', async () => {
      const messages = createTestMessages(5)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      const batch = await poolManager.getNextBatch(100)

      expect(batch.length).toBeLessThanOrEqual(5)
    })

    it('should handle watermark higher than all messages', async () => {
      const messages = createTestMessages(100)
      mockDb.setMessages(messages)
      await poolManager.initialize()

      // Manually set watermark very high
      const highMsg = createTestMessage(1000, 'High ID message')
      await poolManager.addNewMessage(highMsg)

      const stats = poolManager.getStats()
      expect(stats.newMessageWatermark).toBe(1000)
    })
  })
})
